use ckb_sdk::{
    Address, HumanCapacity, ScriptId,
    constants::SIGHASH_TYPE_HASH,
    rpc::{CkbRpcClient, ckb_indexer::SearchKey},
    traits::{
        DefaultCellCollector, DefaultCellDepResolver, DefaultHeaderDepResolver,
        DefaultTransactionDependencyProvider, SecpCkbRawKeySigner,
    },
    tx_builder::{CapacityBalancer, TxBuilder, transfer::CapacityTransferBuilder},
    unlock::{ScriptUnlocker, SecpSighashUnlocker},
};
use ckb_types::{
    bytes::Bytes,
    packed::{CellOutput, WitnessArgs},
    prelude::*,
};
use std::{collections::HashMap, str::FromStr};

/// Wrapper that keeps both the RPC client and the raw URL string together.
///
/// The `Default*` helpers (DefaultCellCollector, DefaultHeaderDepResolver, ...) need a `&str` URL,
/// but `CkbRpcClient` hides its URL field as `pub(crate)`. This struct lets all utility functions
/// use a single `&CkbClient` parameter without exposing the URL separately at every call site.
pub struct CkbClient {
    pub rpc: CkbRpcClient,
    pub url: String,
}

impl CkbClient {
    pub fn new(url: &str) -> Self {
        CkbClient {
            rpc: CkbRpcClient::new(url),
            url: url.to_string(),
        }
    }
}

pub fn get_block_timestamp_by_number(client: &CkbClient, block_number: u64) -> Option<u64> {
    // get_block_by_number returns Result<Option<BlockView>>
    // .ok() converts Result → Option, then the two ?? unwrap both Option layers
    let block = client.rpc.get_block_by_number(block_number.into()).ok()??;
    Some(block.header.inner.timestamp.into())
}

pub fn get_block_timestamp_by_number_2(client: &CkbClient, block_number: u64) -> Option<u64> {
    match client.rpc.get_block_by_number(block_number.into()) {
        Ok(Some(block)) => Some(block.header.inner.timestamp.into()),
        _ => None,
    }
}

/// Builds, signs, and broadcasts a CKB capacity transfer transaction.
pub fn transfer_capacity(
    client: &CkbClient,
    sender_address: &str,
    sender_private_key: &[u8; 32],
    receiver_address: &str,
    amount_ckb: &str,
) {
    let sender = Address::from_str(sender_address).expect("invalid sender address");
    let receiver = Address::from_str(receiver_address).expect("invalid receiver address");
    let capacity = HumanCapacity::from_str(amount_ckb).expect("invalid capacity");

    let sender_key =
        secp256k1::SecretKey::from_slice(sender_private_key).expect("invalid private key");
    let signer = SecpCkbRawKeySigner::new_with_secret_keys(vec![sender_key]);

    let sighash_unlocker = SecpSighashUnlocker::from(Box::new(signer) as Box<_>);
    let sighash_script_id = ScriptId::new_type(SIGHASH_TYPE_HASH.clone());
    let mut unlockers: HashMap<ScriptId, Box<dyn ScriptUnlocker>> = HashMap::default();
    unlockers.insert(sighash_script_id, Box::new(sighash_unlocker));

    // Placeholder witness: 65 zero bytes = size of a real Secp256k1 signature.
    // Needed before signing so the fee estimator can calculate the correct tx byte size.
    let placeholder_witness = WitnessArgs::new_builder()
        .lock(Some(Bytes::from(vec![0u8; 65])).pack())
        .build();

    let balancer = CapacityBalancer::new_simple(
        sender.payload().into(),
        placeholder_witness,
        1000, // fixed fee rate (shannons/KB)
    );

    // HumanCapacity.0 is in shannons; pack() converts u64 → packed::Uint64
    let output = CellOutput::new_builder()
        .capacity(capacity.0.pack())
        .lock((&receiver).into())
        .build();

    let builder = CapacityTransferBuilder::new(vec![(output, Bytes::default())]);

    // All Default* helpers need a &str URL, not a CkbRpcClient reference
    let mut cell_collector = DefaultCellCollector::new(&client.url);
    let header_dep_resolver = DefaultHeaderDepResolver::new(&client.url);
    let tx_dep_provider = DefaultTransactionDependencyProvider::new(&client.url, 10);

    // from_genesis needs ckb_types::core::BlockView; .into() converts from the jsonrpc type
    let cell_dep_resolver = DefaultCellDepResolver::from_genesis(
        &client
            .rpc
            .get_block_by_number(0.into())
            .unwrap()
            .unwrap()
            .into(),
    )
    .expect("failed to parse genesis block");

    let (tx, _) = builder
        .build_unlocked(
            &mut cell_collector,
            &cell_dep_resolver,
            &header_dep_resolver,
            &tx_dep_provider,
            &balancer,
            &unlockers,
        )
        .expect("failed to build and sign transaction");

    // tx.data() returns ckb_types::packed::Transaction; send_transaction expects the jsonrpc type
    let tx_hash = client
        .rpc
        .send_transaction(tx.data().into(), None)
        .expect("failed to broadcast transaction");

    println!("Transaction sent! Hash: {:#x}", tx_hash);
}

/// Fetches the live cells (unspent outputs) matching a given lock script search key.
/// Returns a list of (tx_hash, output_index, capacity_shannons) tuples.
pub fn get_live_cells(client: &CkbClient, search_key: SearchKey) -> Vec<(String, u32, u64)> {
    let mut results = vec![];
    let mut cursor = None;

    loop {
        let page = match client.rpc.get_cells(
            search_key.clone(),
            ckb_sdk::rpc::ckb_indexer::Order::Asc,
            100.into(),
            cursor,
        ) {
            Ok(page) => page,
            Err(_) => break,
        };

        for cell in &page.objects {
            let tx_hash = format!("{:#x}", cell.out_point.tx_hash);
            let index: u32 = cell.out_point.index.into();
            let capacity: u64 = cell.output.capacity.into();
            results.push((tx_hash, index, capacity));
        }

        if page.last_cursor.is_empty() {
            break;
        }
        cursor = Some(page.last_cursor);
    }

    results
}

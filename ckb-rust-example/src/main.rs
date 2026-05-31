mod utils;

use ckb_types::h256;
use utils::{CkbClient, get_block_timestamp_by_number, transfer_capacity};

fn main() {
    let client = CkbClient::new("https://testnet.ckb.dev");
    // let client = CkbClient::new("http://127.0.0.1:8114");  // devnet
    // let client = CkbClient::new("https://mainnet.ckb.dev/rpc");

    // Example: Fetch and print the timestamp of the genesis block (block number 0)
    println!(
        "Genesis Block Timestamp: {}",
        get_block_timestamp_by_number(&client, 0).unwrap_or(0)
    );

    // Example transaction: Transfer CKB from one address to another
    // h256!() parses the hex literal at compile time → H256; .0 extracts the inner [u8; 32]
    let private_key_bytes =
        h256!("0x9f315d5a9618a39fdc487c7a67a8581d40b045bd7a42d83648ca80ef3b2cb4a1").0;

    transfer_capacity(
        &client,
        "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqt435c3epyrupszm7khk6weq5lrlyt52lg48ucew", // sender: account #1
        &private_key_bytes,
        "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqvwg2cen8extgq8s5puft8vf40px3f599cytcyd8", // receiver: account #0
        "100.0",
    );
}

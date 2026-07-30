//! Native-host tests for `contracts/lesson-10-counter`, using `ckb-testtool`'s in-process
//! CKB-VM verifier — no devnet/testnet node required.
//!
//! `Context::default()` looks for compiled contract binaries under `../build/release`
//! (relative to this crate's own directory, since Cargo always runs test binaries with
//! their package directory as the working directory) — i.e. `contracts/build/release/`.
//! Run `make -C contracts build` before `cargo test` so `counter` exists there.

use ckb_testtool::{
    builtin::ALWAYS_SUCCESS,
    context::Context,
    ckb_types::{bytes::Bytes, core::TransactionBuilder, packed::*, prelude::*},
};

const MAX_CYCLES: u64 = 10_000_000;

/// The contract stores the counter as a raw 8-byte little-endian u64 — no molecule, no
/// witness (see contracts/lesson-10-counter/src/main.rs's `parse_counter`).
fn counter_data(n: u64) -> Bytes {
    Bytes::from(n.to_le_bytes().to_vec())
}

/// Deploys an always-success lock (cell ownership is not what this contract's tests are
/// about) and the counter type script binary. `build_script`'s default hash_type (Type,
/// keyed by the Type ID `deploy_cell` auto-assigns each deployed cell) is the idiomatic
/// ckb-testtool convention for exercising script *logic* — it is unrelated to the
/// hash_type a real `/deploy` would use on-chain (data1/data2), which only affects how a
/// node resolves code_hash to a binary, not what the binary does once running.
fn setup() -> (Context, Script, Script) {
    let mut context = Context::default();
    let lock_out_point = context.deploy_cell(ALWAYS_SUCCESS.clone());
    let lock_script = context
        .build_script(&lock_out_point, Bytes::new())
        .expect("build always-success lock script");
    let type_out_point = context.deploy_cell_by_name("counter");
    let type_script = context
        .build_script(&type_out_point, Bytes::new())
        .expect("build counter type script");
    (context, lock_script, type_script)
}

/// A plain wallet cell (lock only, no type script) — funds a tx's capacity/fee without
/// participating in the counter's GroupInput/GroupOutput counting.
fn fund(context: &mut Context, lock: &Script, capacity: u64) -> CellInput {
    let out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(capacity)
            .lock(lock.clone())
            .build(),
        Bytes::new(),
    );
    CellInput::new_builder().previous_output(out_point).build()
}

/// A pre-existing counter cell (lock + counter type script) holding `count`, used as the
/// input side of an update/destruction scenario.
fn counter_cell(
    context: &mut Context,
    lock: &Script,
    type_script: &Script,
    capacity: u64,
    count: u64,
) -> CellInput {
    let out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(capacity)
            .lock(lock.clone())
            .type_(Some(type_script.clone()).pack())
            .build(),
        counter_data(count),
    );
    CellInput::new_builder().previous_output(out_point).build()
}

#[test]
fn creation_with_zero_passes() {
    let (mut context, lock, type_script) = setup();
    let funding = fund(&mut context, &lock, 2000);
    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock)
        .type_(Some(type_script).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(funding)
        .output(output)
        .output_data(counter_data(0).pack())
        .build();
    let tx = context.complete_tx(tx);

    context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("creation with count=0 should pass");
}

#[test]
fn creation_with_nonzero_fails() {
    let (mut context, lock, type_script) = setup();
    let funding = fund(&mut context, &lock, 2000);
    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock)
        .type_(Some(type_script).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(funding)
        .output(output)
        .output_data(counter_data(1).pack())
        .build();
    let tx = context.complete_tx(tx);

    let err = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect_err("creation with count=1 should fail with ERROR_COUNTER_NOT_ZERO_ON_CREATION (6)");
    assert!(
        err.to_string().contains("error code 6 on page"),
        "expected error code 6, got: {err}"
    );
}

#[test]
fn update_increment_by_one_passes() {
    let (mut context, lock, type_script) = setup();
    let counter_input = counter_cell(&mut context, &lock, &type_script, 1000, 5);
    let funding = fund(&mut context, &lock, 2000);
    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock)
        .type_(Some(type_script).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(counter_input)
        .input(funding)
        .output(output)
        .output_data(counter_data(6).pack())
        .build();
    let tx = context.complete_tx(tx);

    context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("increment from 5 to 6 should pass");
}

#[test]
fn update_wrong_increment_fails() {
    let (mut context, lock, type_script) = setup();
    let counter_input = counter_cell(&mut context, &lock, &type_script, 1000, 5);
    let funding = fund(&mut context, &lock, 2000);
    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock)
        .type_(Some(type_script).pack())
        .build();

    let tx = TransactionBuilder::default()
        .input(counter_input)
        .input(funding)
        .output(output)
        .output_data(counter_data(7).pack())
        .build();
    let tx = context.complete_tx(tx);

    let err = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect_err("jumping from 5 to 7 should fail with ERROR_COUNTER_NOT_INCREMENTED (8)");
    assert!(
        err.to_string().contains("error code 8 on page"),
        "expected error code 8, got: {err}"
    );
}

#[test]
fn destruction_passes() {
    let (mut context, lock, type_script) = setup();
    let counter_input = counter_cell(&mut context, &lock, &type_script, 1000, 5);
    // No counter output — a plain lock-only output receives the reclaimed capacity.
    let output = CellOutput::new_builder()
        .capacity(900u64)
        .lock(lock)
        .build();

    let tx = TransactionBuilder::default()
        .input(counter_input)
        .output(output)
        .output_data(Bytes::new().pack())
        .build();
    let tx = context.complete_tx(tx);

    context
        .verify_tx(&tx, MAX_CYCLES)
        .expect("destruction should pass unconditionally");
}

#[test]
fn malformed_data_length_fails() {
    let (mut context, lock, type_script) = setup();
    let funding = fund(&mut context, &lock, 2000);
    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock)
        .type_(Some(type_script).pack())
        .build();

    // 4 bytes instead of the required 8 (a u64).
    let tx = TransactionBuilder::default()
        .input(funding)
        .output(output)
        .output_data(Bytes::from(vec![0u8; 4]).pack())
        .build();
    let tx = context.complete_tx(tx);

    let err = context
        .verify_tx(&tx, MAX_CYCLES)
        .expect_err("4-byte data should fail with ERROR_INVALID_DATA_LENGTH (5)");
    assert!(
        err.to_string().contains("error code 5 on page"),
        "expected error code 5, got: {err}"
    );
}


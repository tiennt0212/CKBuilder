// ============================================================================
// Lesson 10: Counter Type Script (On-Chain Rust Contract)
// ============================================================================
//
// This is a CKB TYPE SCRIPT written in Rust. It compiles to a RISC-V binary
// that runs inside CKB-VM whenever a transaction involves cells that
// reference this script as their type script.
//
// ============================================================================
// KEY CONCEPT: How Type Scripts Differ from Lock Scripts
// ============================================================================
//
// Lock Script (see the sibling lesson-08-hash-lock crate):
//   - Controls WHO can spend (consume) a cell.
//   - Runs ONLY for INPUT cells (cells being consumed).
//
// Type Script (this crate):
//   - Controls WHAT a cell can contain and HOW it can change.
//   - Runs for BOTH INPUT cells AND OUTPUT cells in a transaction.
//   - Example: token supply rules, counter increment rules, NFT uniqueness.
//
// ============================================================================
// KEY CONCEPT: When Does a Type Script Execute?
// ============================================================================
//
// A type script is executed when ANY cell in the transaction references it.
// CKB groups cells by their complete script (code_hash + hash_type + args)
// and runs the script once per group. Source::GroupInput/GroupOutput only
// see cells that share the EXACT SAME type script as the currently executing
// one — cells with different args are validated independently.
//
// Three scenarios this script must handle:
//
// 1. CREATION: Output cells have this type, but no input cells do.
//    The script validates initial state — the counter must start at 0.
//
// 2. UPDATE: Both input and output cells have this type.
//    The script validates the state transition — counter incremented by 1.
//
// 3. DESTRUCTION: Input cells have this type, but no output cells do.
//    Allowed unconditionally — the owner can reclaim their capacity.
//
// ============================================================================

// ============================================================================
// NO_STD DECLARATION
// ============================================================================
//
// CKB scripts run in a bare-metal RISC-V virtual machine (CKB-VM). There is
// no operating system, no filesystem, no networking. #![no_std] tells the
// compiler not to link the standard library; #![no_main] tells it we supply
// our own entry point via ckb_std's entry! macro instead of fn main().
// ============================================================================
#![no_std]
#![no_main]

// ============================================================================
// IMPORTS
// ============================================================================
//
// - error::SysError: the CKB syscall error type. The variant we care about
//   is SysError::IndexOutOfBound, which signals "no more items" when
//   iterating cells at increasing indices — the standard way to count cells
//   in a script group (there is no direct "get count" syscall).
//
// - high_level::load_cell_data(index, source): loads the raw `data` field of
//   a cell. Returns a heap-allocated Vec<u8>, which is why default_alloc! is
//   required below (see MEMORY ALLOCATOR SETUP).
//
// - ckb_constants::Source: Source::GroupInput / Source::GroupOutput restrict
//   iteration to cells sharing this exact type script — the useful case for
//   a type script, as opposed to Source::Input/Output which see every cell.
// ============================================================================
use ckb_std::ckb_constants::Source;
use ckb_std::default_alloc;
use ckb_std::entry;
use ckb_std::error::SysError;
use ckb_std::high_level::load_cell_data;

// ============================================================================
// MEMORY ALLOCATOR SETUP
// ============================================================================
//
// load_cell_data() returns a heap-allocated Vec<u8>. The `entry!` macro does
// NOT register a global allocator on its own — only an explicit default_alloc!()
// (or libc_alloc!()) call does. Without it, this crate fails at LINK time
// (undefined reference to `__rust_alloc` / `__rust_dealloc`), not silently at
// runtime — matching the sibling lesson-08-hash-lock crate's setup.
// ============================================================================
default_alloc!();

// ============================================================================
// ENTRY POINT
// ============================================================================
//
// The function must return Result<(), i8>:
//   - Ok(()) means the script APPROVES the transaction (exit code 0).
//   - Err(code) means the script REJECTS the transaction (non-zero exit code).
//
// If ANY script in a transaction returns an error, the ENTIRE transaction is
// rejected — this is how CKB enforces its validation rules.
// ============================================================================
entry!(main);

// ============================================================================
// ERROR CODES
// ============================================================================
// Convention: code 0 is reserved for success; user-defined codes commonly
// start at 5+ to avoid confusion with CKB-VM's own reserved range.
// ============================================================================

/// The cell data is not exactly 8 bytes (the counter is stored as a u64).
const ERROR_INVALID_DATA_LENGTH: i8 = 5;

/// On creation, the counter must be initialized to 0.
const ERROR_COUNTER_NOT_ZERO_ON_CREATION: i8 = 6;

/// On update, there must be exactly one input and one output in the group.
/// (This simple counter only supports 1-to-1 transitions.)
const ERROR_INVALID_CELL_COUNT: i8 = 7;

/// On update, the output counter must equal input counter + 1.
const ERROR_COUNTER_NOT_INCREMENTED: i8 = 8;

// ============================================================================
// MAIN VALIDATION LOGIC
// ============================================================================
//
// ckb-std 0.16's entry! macro requires the entry function to return `i8`
// directly (0 = success, non-zero = the rejection code), unlike some other
// ckb-std versions/course material that accept `Result<(), i8>` via a
// Termination-like impl. `run()` keeps the idiomatic Result-based control
// flow (early '?' returns through the match arms below); `main()` is a thin
// boundary that converts it to the exit code CKB-VM expects.
fn main() -> i8 {
    match run() {
        Ok(()) => 0,
        Err(code) => code,
    }
}

fn run() -> Result<(), i8> {
    // Count cells in our script group to determine which scenario applies:
    // creation (0 inputs), update (inputs and outputs), or destruction
    // (0 outputs).
    let input_count = count_cells_in_group(Source::GroupInput);
    let output_count = count_cells_in_group(Source::GroupOutput);

    match (input_count, output_count) {
        // --------------------------------------------------------------
        // CREATION: no inputs with this type, but outputs exist.
        // Every new counter cell must start at 0 — this prevents someone
        // from minting a counter at an arbitrary value, which would break
        // the state machine's monotonic guarantee.
        // --------------------------------------------------------------
        (0, _output_count) => {
            for i in 0..output_count {
                let data = load_cell_data(i, Source::GroupOutput)
                    .map_err(|_| ERROR_INVALID_DATA_LENGTH)?;
                let counter = parse_counter(&data)?;
                if counter != 0 {
                    return Err(ERROR_COUNTER_NOT_ZERO_ON_CREATION);
                }
            }
            Ok(())
        }

        // --------------------------------------------------------------
        // UPDATE: both inputs and outputs exist with this type. The
        // counter must be incremented by exactly 1 — no skipping, no
        // decrementing, no resetting. The lock script handles WHO may
        // update the cell; this type script enforces HOW the data may
        // change, regardless of who submits the transaction.
        // --------------------------------------------------------------
        (_input_count, _output_count) if input_count > 0 && output_count > 0 => {
            if input_count != 1 || output_count != 1 {
                return Err(ERROR_INVALID_CELL_COUNT);
            }

            let input_data = load_cell_data(0, Source::GroupInput)
                .map_err(|_| ERROR_INVALID_DATA_LENGTH)?;
            let input_counter = parse_counter(&input_data)?;

            let output_data = load_cell_data(0, Source::GroupOutput)
                .map_err(|_| ERROR_INVALID_DATA_LENGTH)?;
            let output_counter = parse_counter(&output_data)?;

            if output_counter != input_counter + 1 {
                return Err(ERROR_COUNTER_NOT_INCREMENTED);
            }

            Ok(())
        }

        // --------------------------------------------------------------
        // DESTRUCTION: inputs exist but no outputs with this type.
        // Allowed unconditionally — the owner can stop counting and
        // reclaim the cell's CKB capacity.
        // --------------------------------------------------------------
        (_input_count, 0) => Ok(()),

        // --------------------------------------------------------------
        // IMPOSSIBLE: the script would not be invoked if no cells
        // referenced it. Handled defensively.
        // --------------------------------------------------------------
        _ => Ok(()),
    }
}

// ============================================================================
// Helper: Parse Counter from Cell Data
// ============================================================================
// CKB cell data is raw bytes with no built-in serialization format. The
// counter is stored as a u64 in little-endian byte order (8 bytes) — compact,
// matches RISC-V's native byte order, and strict length checking prevents
// accidental misuse. Molecule encoding is deliberately not used here; this
// lesson's next installment introduces it for more complex data shapes.
// ============================================================================
fn parse_counter(data: &[u8]) -> Result<u64, i8> {
    if data.len() != 8 {
        return Err(ERROR_INVALID_DATA_LENGTH);
    }
    let bytes: [u8; 8] = data.try_into().map_err(|_| ERROR_INVALID_DATA_LENGTH)?;
    Ok(u64::from_le_bytes(bytes))
}

// ============================================================================
// Helper: Count Cells in a Script Group
// ============================================================================
// There is no direct "get count" syscall — the idiomatic pattern is to try
// loading cell data at increasing indices until SysError::IndexOutOfBound
// signals there are no more cells in this group.
// ============================================================================
fn count_cells_in_group(source: Source) -> usize {
    let mut count = 0;
    loop {
        match load_cell_data(count, source) {
            Ok(_) => count += 1,
            Err(SysError::IndexOutOfBound) => break,
            Err(_) => break,
        }
    }
    count
}

// ============================================================================
// Summary of the Counter Type Script State Machine
// ============================================================================
//
//   +----------+     CREATE      +-----------+     UPDATE      +-----------+
//   |          | --------------> | counter=0 | --------------> | counter=1 |
//   | (no cell)|                 +-----------+                 +-----------+
//   +----------+                      |                             |
//                                     |  DESTROY                    |  UPDATE
//                                     v                             v
//                                +----------+                 +-----------+
//                                | (no cell)|                 | counter=2 |
//                                +----------+                 +-----------+
//                                                                  |
//                                                                  | ...
//                                                                  v
//                                                             +-----------+
//                                                             | counter=N |
//                                                             +-----------+
//                                                                  |
//                                                                  | DESTROY
//                                                                  v
//                                                             +----------+
//                                                             | (no cell)|
//                                                             +----------+
//
// Guarantees enforced at the consensus level (every node re-verifies the
// type script — not even a malicious miner can create an invalid transition):
//   - Every counter starts at 0.
//   - Every update increments by exactly 1.
//   - Destruction is always allowed.
// ============================================================================

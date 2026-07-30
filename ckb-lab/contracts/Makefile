TARGET := riscv64imac-unknown-none-elf
BUILD_DIR := build/release
CRATES := hash-lock counter

.PHONY: build check test clean

build:
	cargo build --release --target $(TARGET) $(foreach c,$(CRATES),-p $(c))
	mkdir -p $(BUILD_DIR)
	$(foreach c,$(CRATES),cp target/$(TARGET)/release/$(c) $(BUILD_DIR)/$(c);)

check:
	cargo check --release --target $(TARGET) $(foreach c,$(CRATES),-p $(c))

# Depends on build: ckb-testtool's Context::default() reads compiled binaries from
# build/release/, which only exists once the contract crates are built.
test: build
	cargo test -p tests

clean:
	cargo clean
	rm -rf $(BUILD_DIR)

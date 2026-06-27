# Cell Explorer — Feature Documentation

> Lesson 06 · `lessons/06-cell-explorer/src/index.ts`

Tài liệu này mô tả các tính năng của trang Cell Explorer, API tương ứng từ CCC SDK, và các điểm cần lưu ý khi maintain hoặc mở rộng.

---

## Tổng quan

Cell Explorer là công cụ để truy vấn, lọc và phân tích các on-chain cells trên mạng CKB. Tất cả dữ liệu được lấy từ CKB Indexer thông qua CCC SDK (`@ckb-ccc/core`).

---

## Danh sách tính năng

### 1. Query Cells by Lock Script

**Mô tả:** Liệt kê tất cả live cells mà một địa chỉ đang sở hữu.

```typescript
client.findCellsByLock(
  lockScript,  // Script
  undefined,   // type?: Script — lọc thêm theo type script
  true,        // withData?: boolean
  "desc",      // order?: "asc" | "desc"
  10           // limit?: number
);
// => AsyncGenerator<Cell>
```

---

### 2. Query Cells by Type Script

**Mô tả:** Tìm tất cả cells được quản lý bởi một smart contract (ví dụ: Nervos DAO), không phân biệt chủ sở hữu.

```typescript
// Lấy info của well-known script
const daoInfo = await client.getKnownScript(ccc.KnownScript.NervosDao);
const daoTypeScript = ccc.Script.from({
  codeHash: daoInfo.codeHash,
  hashType: daoInfo.hashType,
  args: "0x",
});

client.findCellsByType(
  daoTypeScript,
  true,    // withData
  "desc",  // order
  5        // limit
);
// => AsyncGenerator<Cell>
```

**Lưu ý về Nervos DAO cell data:**
- Deposit cell: `outputData === "0x0000000000000000"` (8 zero bytes)
- Withdraw phase 1 cell: `outputData` = block number của deposit (8 bytes little-endian)

---

### 3. Filter by Capacity Range

**Mô tả:** Lọc cells trong khoảng giá trị CKB chỉ định. Semantics `[inclusive, exclusive)`.

```typescript
client.findCells({
  script: lockScript,
  scriptType: "lock",
  scriptSearchMode: "exact",
  filter: {
    outputCapacityRange: [
      100n * 100_000_000n,    // min (inclusive) — 100 CKB
      1_000n * 100_000_000n,  // max (exclusive) — 1000 CKB
    ],
  },
  withData: true,
}, "desc", 5);
```

**Đơn vị:** 1 CKB = 100,000,000 shannons (tương tự satoshi trong Bitcoin).

---

### 4. Filter by Data Pattern

**Mô tả:** Tìm cells có output data khớp pattern hex. Ba mode tìm kiếm:

| Mode | Ý nghĩa |
|---|---|
| `"prefix"` | Data bắt đầu bằng pattern |
| `"exact"` | Data khớp chính xác |
| `"partial"` | Data chứa pattern ở bất kỳ vị trí nào |

```typescript
client.findCells({
  script: lockScript,
  scriptType: "lock",
  scriptSearchMode: "exact",
  filter: {
    outputData: "0x00",
    outputDataSearchMode: "prefix",
  },
  withData: true,
}, "desc", 5);
```

---

### 5. Filter by Data Length

**Mô tả:** Lọc cells theo độ dài output data (bytes). Hữu ích để tìm UDT cells (16 bytes).

```typescript
client.findCells({
  script: lockScript,
  scriptType: "lock",
  scriptSearchMode: "exact",
  filter: {
    outputDataLenRange: [16n, 17n],  // exactly 16 bytes
  },
  withData: true,
});
```

---

### 6. Balance Query (Efficient)

**Mô tả:** Lấy tổng capacity của một lock script mà không cần iterate từng cell — tính toán server-side.

```typescript
const balance = await client.getBalanceSingle(lockScript);
// => bigint (shannons)
// Hiển thị: ccc.fixedPointToString(balance) hoặc tự chia cho 100_000_000n
```

---

### 7. Check Live / Dead Cell

**Mô tả:** Kiểm tra một cell cụ thể còn tồn tại hay đã bị tiêu thụ.

```typescript
const liveCell = await client.getCellLive(
  { txHash: "0x...", index: 0 }, // OutPoint
  true,   // withData
  true    // includeTxPool — bao gồm transactions đang pending, tránh double-spend
);
// => Cell nếu còn live, null nếu đã dead
```

---

### 8. Manual Pagination

**Mô tả:** Phân trang thủ công với cursor, dùng cho UI "Load More" hoặc infinite scroll.

```typescript
const searchKey = {
  script: lockScript,
  scriptType: "lock" as const,
  scriptSearchMode: "exact" as const,
  withData: false,
};

let cursor: string | undefined = undefined;

const response = await client.findCellsPaged(
  searchKey,
  "asc",    // order
  10,       // page size
  cursor    // undefined cho page đầu
);

// response.cells: Cell[]
// response.lastCursor: string — dùng cho lần gọi tiếp theo
cursor = response.lastCursor;

// Hết data khi response.cells.length < page size
```

---

### 9. Cell Classification

**Mô tả:** Phân loại cell dựa trên type script và output data.

| Có Type Script | Có Data | Phân loại |
|---|---|---|
| No | No | Plain CKB |
| No | Yes | Data Cell |
| Yes | Yes (16 bytes) | UDT Cell (likely) |
| Yes | Yes (khác kích thước) | Typed Data Cell (NFT / Spore…) |
| Yes | No | Script Cell |

```typescript
function classifyCell(cell: ccc.Cell): string {
  const hasType = !!cell.cellOutput.type;
  const hasData = cell.outputData !== undefined && cell.outputData !== "0x";
  const dataByteLength = hasData ? (cell.outputData.length - 2) / 2 : 0;

  if (!hasType && !hasData) return "Plain CKB";
  if (!hasType && hasData)  return "Data Cell";
  if (hasType && hasData)   return dataByteLength === 16 ? "UDT Cell" : "Typed Data Cell";
  return "Script Cell";
}
```

---

### 10. Statistics Aggregation

**Mô tả:** Thu thập thống kê trong quá trình iterate — tổng cells, tổng capacity, min/max/avg, số cells có type, số cells có data.

```typescript
const stats = {
  totalCells: 0,
  totalCapacity: 0n,
  cellsWithType: 0,
  cellsWithData: 0,
  minCapacity: BigInt(Number.MAX_SAFE_INTEGER),
  maxCapacity: 0n,
};

for await (const cell of client.findCellsByLock(lockScript)) {
  const capacity = cell.cellOutput.capacity;
  stats.totalCells++;
  stats.totalCapacity += capacity;
  if (cell.cellOutput.type) stats.cellsWithType++;
  if (cell.outputData && cell.outputData !== "0x") stats.cellsWithData++;
  if (capacity < stats.minCapacity) stats.minCapacity = capacity;
  if (capacity > stats.maxCapacity) stats.maxCapacity = capacity;
}

const avgCapacity = stats.totalCapacity / BigInt(stats.totalCells);
```

---

## Tóm tắt API

| Hàm | Trả về | Mục đích |
|---|---|---|
| `client.getTip()` | `bigint` | Block number hiện tại |
| `ccc.Address.fromString(addr, client)` | `Address` | Decode address → lock script |
| `client.findCellsByLock(lock, type?, withData?, order?, limit?)` | `AsyncGenerator<Cell>` | Query by lock script |
| `client.findCellsByType(type, withData?, order?, limit?)` | `AsyncGenerator<Cell>` | Query by type script |
| `client.findCells(searchKey, order?, limit?)` | `AsyncGenerator<Cell>` | Query với filter đầy đủ |
| `client.findCellsPaged(searchKey, order?, limit?, cursor?)` | `{ cells, lastCursor }` | Manual pagination |
| `client.getBalanceSingle(lock)` | `bigint` | Tổng balance (shannons) |
| `client.getCellLive(outPoint, withData?, includeTxPool?)` | `Cell \| null` | Check live/dead |
| `client.getKnownScript(KnownScript.NervosDao)` | `ScriptInfo` | Lấy well-known script info |

---

## Cấu trúc Cell Object (ccc.Cell)

```typescript
interface Cell {
  outPoint: {
    txHash: string;  // 0x + 64 hex chars
    index: number;
  };
  cellOutput: {
    capacity: bigint;     // shannons
    lock: Script;         // lock script (bắt buộc)
    type?: Script;        // type script (tuỳ chọn)
  };
  outputData: string;     // hex string, "0x" nếu rỗng
}
```

---

## Lưu ý quan trọng

- **AsyncGenerator:** Tất cả hàm trả về nhiều cells đều dùng async generator — iterate bằng `for await...of`, có thể `break` sớm.
- **Shannons vs CKB:** Mọi capacity đều tính bằng shannons (bigint). 1 CKB = 100,000,000 shannons.
- **Dead cells:** Indexer chỉ trả về live cells. Dead cells (đã spent) không xuất hiện trong query results.
- **includeTxPool:** Trong `getCellLive`, set `true` để tránh race condition với pending transactions.
- **scriptSearchMode:** Luôn dùng `"exact"` trừ khi muốn match prefix của args (advanced use case).

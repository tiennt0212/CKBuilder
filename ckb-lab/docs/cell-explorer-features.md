# Cell Explorer — Feature Documentation

Tài liệu này mô tả các tính năng của trang **Cell Explorer** trong CKBuilder app, từ góc độ người dùng và developer maintain.

---

## Tổng quan

Cell Explorer là công cụ để query, lọc và phân tích live cells trên mạng CKB. Layout gồm 3 vùng:

- **Sidebar (trái):** Form query — lock script, type script, advanced filters
- **Main area (phải):** Table kết quả — cells, stats, classification pills
- **Drawer (overlay):** Chi tiết một cell khi click vào row

Tất cả data lấy từ CKB Indexer qua `findCellsPaged`. Lock Script và Type Script đều là optional — có thể fill một hoặc cả hai.

---

## Query Form (Sidebar)

### Lock Script (Address)

Nhập CKB address (testnet `ckt1…` hoặc mainnet `ckb1…`) → app decode thành lock script.

```
API: findCellsPaged({ script: lockScript, scriptType: "lock", ... })
```

Để trống = không filter theo lock.

### Type Script

Combobox cho phép chọn nhanh từ danh sách preset hoặc nhập thủ công. Xem chi tiết trong phần **Type Script Presets & Saved Type Scripts** bên dưới.

Khi cả hai lock và type đều được điền:
```
API: findCellsPaged({ script: lockScript, scriptType: "lock", filter: { script: typeScript }, ... })
```
→ Trả về cells owned by địa chỉ đó VÀ có type script được chọn.

Khi chỉ có type script:
```
API: findCellsPaged({ script: typeScript, scriptType: "type", ... })
```
→ Trả về tất cả cells của type script đó, không phân biệt owner.

Để trống = không filter theo type.

### Advanced Filters

Gửi lên indexer qua `filter` object. **Khi thay đổi bất kỳ filter nào, cursor reset và query chạy lại.**

#### Capacity Range

Lọc cells trong khoảng capacity. Semantics: `[min inclusive, max exclusive)`.
- Đơn vị nhập: CKB → app convert sang shannons (`× 100_000_000n`)
- Optional ở cả hai đầu

```
API: filter.outputCapacityRange = [minShannons, maxShannons]
```

#### Data Length

Lọc theo độ dài output data (bytes). Semantics: `[min inclusive, max exclusive)`.
Hữu ích để tìm UDT cells (= 16 bytes).

```
API: filter.outputDataLenRange = [minBytes, maxBytes]
```

#### Data Pattern

Tìm cells có output data khớp hex pattern.

| Mode | Ý nghĩa |
|---|---|
| `prefix` | Data bắt đầu bằng pattern |
| `exact` | Data khớp chính xác |
| `partial` | Data chứa pattern ở bất kỳ vị trí nào |

```
API: filter.outputData + filter.outputDataSearchMode
```

### Query Button

Trigger fetch từ đầu (cursor reset). Disabled khi cả lock lẫn type đều trống.

---

## Type Script Presets & Saved Type Scripts

### Built-in Presets

Các type script phổ biến được pre-loaded, network-aware (code_hash khác nhau trên testnet/mainnet):

| Preset | Nguồn code_hash |
|---|---|
| Nervos DAO | `client.getKnownScript(KnownScript.NervosDao)` |
| xUDT | `client.getKnownScript(KnownScript.XUdt)` |
| Spore / DOB | hardcoded per network |

### User-Saved Type Scripts

Người dùng có thể lưu type script tùy chỉnh với memo để tái sử dụng và chia sẻ.

**Cách thêm:** Nhấn nút **"+ Add type script…"** ở cuối dropdown → mở inline form với các trường:
- `code_hash` (hex, required)
- `hash_type` — `type` / `data1` / `data2`
- `args` (hex, mặc định `0x`)
- **Memo** — nhãn hoặc ghi chú ngắn (ví dụ: "test xUDT devnet", "NFT collection XYZ")

### Persistence

Saved type scripts lưu tại `localStorage` key `ckbuilder:typeScriptPresets`. Format:

```json
[
  {
    "label": "My Token",
    "codeHash": "0x1a2b…",
    "hashType": "type",
    "args": "0x",
    "memo": "test xUDT on devnet",
    "network": "testnet"
  }
]
```

Entries được filter theo network hiện tại khi hiển thị trong dropdown.

### Export / Import

- **Export:** Download file JSON chứa toàn bộ saved type scripts (tất cả networks)
- **Import:** Upload file JSON để merge vào localStorage (dedup theo `codeHash + network`)

Mục đích: chia sẻ type script collection với teammates hoặc sync giữa các thiết bị.

---

## Client-side Classification Pills

Lọc nhanh rows đã fetch theo loại cell. Không trigger re-fetch.

| Pill | Điều kiện |
|---|---|
| **All** | Hiện tất cả |
| **Plain CKB** | `!hasType && !hasData` |
| **Data Cell** | `!hasType && hasData` |
| **UDT Cell** | `hasType && hasData && dataByteLength === 16` |
| **Script Cell** | `hasType && (!hasData || dataByteLength !== 16)` |

Phân loại UDT Cell (dataByteLength = 16) là heuristic — bao gồm xUDT/sUDT. NFT/Spore với data ≠ 16 bytes → Script Cell.

**Lưu ý:** Pills lọc client-side. Nếu chưa Load More hết, có thể bỏ sót cells ở page sau. Dùng Data Length filter (server-side) nếu cần exhaustive search theo loại.

---

## Out-point Text Search

Client-side filter theo `txHash` hoặc lock label. Kết hợp với classification pills theo logic AND.

---

## Statistics Bar

Aggregate trên toàn bộ cells đã load (không phải tổng on-chain):

| Stat | Nguồn |
|---|---|
| Cells | `cells.length` |
| Total | Tổng capacity → CKB |
| Avg | Total / Cells |
| Has type | Số cells có `cellOutput.type != null` |
| Has data | Số cells có `outputData !== "0x"` |

---

## Manual Pagination (Load More)

```
API: findCellsPaged(searchKey, "desc", PAGE_SIZE, cursor)
```

- Page đầu: `cursor = undefined`
- `response.lastCursor` → cursor cho lần gọi tiếp
- `hasMore = response.cells.length >= PAGE_SIZE`
- Cursor reset khi: thay đổi lock/type input hoặc advanced filter

---

## Cell Detail (Drawer)

Click một row → Drawer mở từ bên phải, overlay lên phần table. Close bằng nút ✕ hoặc click ra ngoài.

### Capacity Breakdown

| Field | Nguồn |
|---|---|
| Capacity | `cell.cellOutput.capacity` → CKB |
| Occupied | `ccc.fixedPointFrom(cell.occupiedSize)` |
| Free | `cell.capacityFree` = Capacity − Occupied |

### Metadata

- **Class:** Plain CKB / Data Cell / UDT Cell / Script Cell
- **Status:** Live (indexer chỉ trả về live cells)

### Collapsible Sections

- **Out-point:** txHash + index
- **Lock script:** code_hash, hash_type, args + lock label
- **Type script:** code_hash, hash_type, args — `null` nếu không có
- **Output data:** raw hex — `0x` nếu không có data

---

## API thực sự sử dụng

| Hàm | Mục đích |
|---|---|
| `ccc.Address.fromString(addr, client)` | Decode address → lock script |
| `client.findCellsPaged(searchKey, order, limit, cursor)` | Fetch cells với pagination |
| `client.getBalanceSingle(lock)` | Tổng balance (không iterate từng cell) |
| `client.getKnownScript(KnownScript.X)` | Code_hash của well-known scripts (DAO, xUDT…) |

---

## Lưu ý quan trọng

- **Shannons vs CKB:** Mọi capacity là `bigint` shannons. 1 CKB = 100,000,000 shannons.
- **Dead cells:** Indexer chỉ trả về live cells. Drawer luôn hiển thị "Live".
- **scriptSearchMode:** Luôn dùng `"exact"`.
- **Network-aware presets:** Built-in presets gọi `getKnownScript` mỗi lần query để đảm bảo code_hash đúng với network hiện tại.
- **Saved scripts & network:** Entries trong localStorage có trường `network` — chỉ hiển thị entries khớp với network đang active.
- **Nervos DAO cell data:** Deposit = `"0x0000000000000000"` (8 zero bytes). Withdrawal phase 1 = block number deposit (8 bytes LE).

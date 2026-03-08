

## Plan: เพิ่ม Trade Graph View ใน Trading Journal

### สิ่งที่จะทำ

สร้าง Tab ใหม่ "🔗 กราฟ" ใน Trading Journal ที่แสดง Network Graph ของ trades โดยแปลงข้อมูล trades เป็น nodes และ links ที่เหมาะกับการวิเคราะห์การเทรด

### การออกแบบ Graph สำหรับ Trading Journal

**Nodes** = แต่ละ trade จะเป็น node หนึ่งจุด
- ขนาด node = ขึ้นกับ P&L (กำไรมากยิ่งใหญ่)
- สี node = เขียว (กำไร), แดง (ขาดทุน), เทา (OPEN)
- Label = Symbol + วันที่

**Links** = ความเชื่อมโยงระหว่าง trades
- เทรดคู่ Symbol เดียวกัน → link สีขาว
- เทรดที่ใช้ Strategy เดียวกัน → link สีม่วง
- เทรดที่อยู่ Folder เดียวกัน → link สีฟ้า

**Clustering** = จัดกลุ่มอัตโนมัติตาม Symbol หรือ Strategy

**Interactions** = คลิก node เพื่อดูรายละเอียด trade, ซูม, ลาก

### ไฟล์ที่ต้องแก้ไข

1. **สร้างใหม่: `src/components/TradingJournal/TradeGraphTab.tsx`**
   - Component ใหม่ที่รับ `trades: Trade[]` เป็น props
   - ใช้ D3.js สร้าง force-directed graph
   - แปลง trades → GraphNodes (ขนาดตาม P&L, สีตามผลลัพธ์)
   - สร้าง links จาก shared symbol, strategy, folder
   - Community detection ด้วย GraphClustering
   - Tooltip แสดง trade details เมื่อ hover
   - Click node แสดง trade panel ด้านล่าง
   - Toolbar: Clusters toggle, Reset, Group by (Symbol/Strategy/Session)

2. **แก้ไข: `src/components/TradingJournal/JournalTabs.tsx`**
   - เพิ่ม tab `{ id: 'graph', label: '🔗 กราฟ' }`
   - เพิ่ม `TabsContent` สำหรับ `TradeGraphTab`

### Technical Details

- ใช้ D3 force simulation เหมือน GraphView.tsx ที่มีอยู่แล้ว
- Node importance คำนวณจาก: |P&L| + trade count ของ symbol นั้น
- Cluster boundaries แสดงเป็นวงกลม dashed รอบกลุ่ม
- รองรับ zoom/pan และ drag nodes
- Legend แสดงความหมายของสีและเส้น


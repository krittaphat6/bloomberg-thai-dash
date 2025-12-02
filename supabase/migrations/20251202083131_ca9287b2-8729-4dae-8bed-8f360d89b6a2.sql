-- เพิ่ม policy สำหรับ delete webhooks
CREATE POLICY "Anyone can delete webhooks" 
ON webhooks FOR DELETE 
USING (true);

-- เพิ่ม policy สำหรับ delete chat_rooms
CREATE POLICY "Anyone can delete chat rooms" 
ON chat_rooms FOR DELETE 
USING (true);

-- เพิ่ม policy สำหรับ delete room_members
CREATE POLICY "Anyone can delete room members" 
ON room_members FOR DELETE 
USING (true);

-- เพิ่ม policy สำหรับ delete messages
CREATE POLICY "Anyone can delete messages" 
ON messages FOR DELETE 
USING (true);
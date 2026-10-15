---
name: network-protocol-mqtt-modbus-websocket
description: "Skill protokol komunikasi industri dan telemetri (Modbus RTU/TCP, perhitungan checksum CRC-16, struktur topik MQTT, framing paket serial UART, dan exponential backoff retry)."
---

# Industrial Network Protocols: Modbus RTU/TCP, CRC-16 & MQTT Pro

## Implementasi Standar Checksum Modbus RTU CRC-16 (Siap Salin & Teruji)
```python
def hitung_modbus_crc16(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 0x0001:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
    return crc & 0xFFFF

def buat_frame_modbus_rtu(slave_id: int, func_code: int, start_addr: int, count: int) -> bytes:
    payload = bytes([
        slave_id & 0xFF,
        func_code & 0xFF,
        (start_addr >> 8) & 0xFF,
        start_addr & 0xFF,
        (count >> 8) & 0xFF,
        count & 0xFF,
    ])
    crc = hitung_modbus_crc16(payload)
    # Modbus RTU mengirim byte rendah (LSB) terlebih dahulu, lalu byte tinggi (MSB)
    return payload + bytes([crc & 0xFF, (crc >> 8) & 0xFF])
```

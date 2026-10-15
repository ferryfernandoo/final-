---
name: 3d-multiplayer-netcode-interpolation
description: "Skill arsitektur Multiplayer 3D Real-Time (WebSocket / WebRTC): Client-Side Prediction, Snapshot Interpolation posisi & kuaternion (lerp/slerp), dan kompresi state transformasi 3D."
---

# Multiplayer 3D Netcode & Entity Interpolation Pro

Jangan pernah langsung memindahkan posisi pemain lawan saat paket jaringan tiba (`otherPlayer.position.copy(netPos)` akan terlihat patah-patah 10–20Hz). Simpan `targetNetPos` dan `targetNetQuat`, lalu haluskan di dalam loop `animate(dt)` 60Hz dengan `otherPlayer.position.lerp(targetNetPos, 0.2)` dan `otherPlayer.quaternion.slerp(targetNetQuat, 0.2)`.

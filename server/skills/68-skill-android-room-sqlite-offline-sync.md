---
name: android-room-sqlite-offline-sync
description: "Skill penyimpanan database lokal Android menggunakan Room Persistence Library (Entity, DAO, Flow, Migration), DataStore Preferences, dan sinkronisasi latar belakang menggunakan WorkManager."
---

# Android Offline-First Architecture: Room SQLite & WorkManager Pro

## Pola Standar `@Entity` dan `@Dao` di Room Kotlin
```kotlin
@Entity(tableName = "production_logs")
data class ProductionLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val lineName: String,
    val targetQty: Int,
    val actualQty: Int,
    val synced: Boolean = false
)

@Dao
interface ProductionDao {
    @Query("SELECT * FROM production_logs ORDER BY id DESC")
    fun observeAll(): kotlinx.coroutines.flow.Flow<List<ProductionLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: ProductionLogEntity): Long
}
```
Mengembalikan `Flow<List<...>>` dari DAO membuat layar Jetpack Compose otomatis memperbarui tampilan setiap kali ada baris baru yang masuk ke database!

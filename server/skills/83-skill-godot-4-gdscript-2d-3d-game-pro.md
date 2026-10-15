---
name: godot-4-gdscript-2d-3d-game-pro
description: "Skill pembuatan game 2D dan 3D menggunakan Godot Engine 4.x (GDScript 2.0): arsitektur Scene/Node, CharacterBody3D, Area3D, Signals, State Machine, dan ekspor ke Android (.apk) serta Web (HTML5)."
---

# Godot Engine 4.x (GDScript) 2D & 3D Game Development Pro

## Template `CharacterBody3D` Godot 4 dengan Fisika Halus
```gdscript
extends CharacterBody3D

@export var speed: float = 8.0
@export var jump_velocity: float = 5.5
var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta

    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = jump_velocity

    var input_dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
    if direction:
        velocity.x = direction.x * speed
        velocity.z = direction.z * speed
    else:
        velocity.x = move_toward(velocity.x, 0, speed)
        velocity.z = move_toward(velocity.z, 0, speed)

    move_and_slide()
```

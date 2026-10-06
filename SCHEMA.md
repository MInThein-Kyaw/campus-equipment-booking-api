# Schema

```text
equipment
---------
id TEXT PRIMARY KEY
name TEXT NOT NULL
location TEXT NOT NULL
        |
        | 1-to-many
        v
bookings
--------
id TEXT PRIMARY KEY
equipment_id TEXT NOT NULL -> equipment.id
borrower_name TEXT NOT NULL
start_at TEXT NOT NULL
end_at TEXT NOT NULL
purpose TEXT NOT NULL
created_at TEXT NOT NULL
```

The application checks the interval rule before create and update:

`new.startAt < existing.endAt AND new.endAt > existing.startAt`

Adjacent bookings are allowed because an end time equal to another start time is not an overlap.
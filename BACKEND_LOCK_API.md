# Backend: Lock Seat API – OrderedSeats must get Show_id and Status

The Angular app calls **POST /api/Order/lock** with this JSON body:

```json
{
  "UserId": 1,
  "ShowId": 1010,
  "Row": 2,
  "Col": 10,
  "sectionId": 1,
  "Status": 1
}
```

- **ShowId** – the show this seat belongs to (must be saved in `OrderedSeats.Show_id`).
- **Status** – `1` = reserved for user (must be saved in `OrderedSeats.Status`).  
  Do **not** leave `Status` as `0` when creating a reservation.

When you create or update a row in **dbo.OrderedSeats**, please:

1. Set **Show_id** = value from the request body (`ShowId`).
2. Set **Status** = value from the request body (`Status`), i.e. **1** for a new reservation.

The frontend already sends these fields; the missing piece is mapping them into the OrderedSeats table on the server.

If your DTO or entity uses different names (e.g. `ShowId` in C#), map it to the DB column `Show_id` when saving.

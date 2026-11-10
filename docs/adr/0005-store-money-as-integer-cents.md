# Store every amount of money as integer cents, rounded once at the point of sale

Every amount Cadence stores (`courses.price`, `purchases.amount_paid`, `refunds.amount_refunded`) is a whole number of cents in an `integer` column. Discounts are worked out in cents and rounded once, with `Math.round`, at the point of sale; after that the amount is never recalculated, so a Refund gives back exactly what was paid. Only `formatPrice(cents)` turns cents into dollars, and only for the screen.

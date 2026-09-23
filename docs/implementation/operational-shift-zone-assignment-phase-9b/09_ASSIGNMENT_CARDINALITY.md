# 09 — Cardinality

One user may hold several zones in one shift. One zone/date/shift may have zero or one PRIMARY and any number of SUPPORT users. The same user cannot hold PRIMARY and SUPPORT simultaneously for the same zone/date/shift. Preview identifies conflicts; apply repeats validation and SQLite partial unique indexes close the race. A replacement cancels the prior row and inserts a new row, preserving both records.

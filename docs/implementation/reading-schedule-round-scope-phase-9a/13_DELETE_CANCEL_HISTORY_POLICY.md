# 13 — Delete and cancel history policy

An empty disposable round may be hard-deleted along with its scope rows. A round with reading rows is changed to `CANCELLED`; its readings and scope remain. Day deletion applies that rule per round and reports deleted versus cancelled counts. The previous force path no longer hard-deletes operational history.

`CANCELLED` is represented in backend and frontend schemas. It is omitted from current/upcoming selection and User actionable queues. Admin schedule history can still display and inspect the cancelled round. SQLite triggers reject direct deletion of a round or meter with readings.

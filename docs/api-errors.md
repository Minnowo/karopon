# API errors

Failed API requests answer with an RFC 9457 problem details body
(https://www.rfc-editor.org/rfc/rfc9457),
media type `application/problem+json`. Built by `src/api/problem.go`;
read by `ApiError` in `src/ui/src/api/api.ts`.

| Member   | Meaning                                                                     |
|----------|-----------------------------------------------------------------------------|
| `type`   | Problem type URI. Absent means `about:blank`: nothing beyond the status     |
| `title`  | Short summary of the type; for `about:blank`, the HTTP status phrase        |
| `status` | The HTTP status code                                                        |
| `detail` | Message for the user: what happened and what to do. Never internal errors   |
| `errors` | Only on the types below: one entry per field that needs fixing              |

Messages say what to do in plain words ("Portion must be more than 0."),
without blame words ("invalid") or symbols (`<=`). Internal errors go to the
server log, never into `detail`.

## validation-error

Type URI:
`https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#validation-error`

Status 422. The request was well formed, but some fields need changing.
`errors` lists every such field at once, so the user can fix them together.
Each entry has:

- `pointer`: a JSON Pointer in URI fragment form into the request body,
  such as `#/portion`.
- `detail`: the message to show next to that field.

```
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#validation-error",
  "title": "Some values need to be changed.",
  "status": 422,
  "detail": "Check the highlighted fields and try again.",
  "errors": [
    {"detail": "Enter a name for the food.", "pointer": "#/name"},
    {"detail": "Portion must be more than 0.", "pointer": "#/portion"}
  ]
}
```

## already-exists

Type URI:
`https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#already-exists`

Status 409. The create or update would duplicate something the user
already has (a unique constraint in the database). `errors` has one entry,
shaped like a validation error, pointing at the field to change; `detail`
repeats its message.

```
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://github.com/Minnowo/karopon/blob/main/docs/api-errors.md#already-exists",
  "title": "This already exists.",
  "status": 409,
  "detail": "You already have Rice measured in g. Change the name or the unit.",
  "errors": [
    {"detail": "You already have Rice measured in g. Change the name or the unit.", "pointer": "#/name"}
  ]
}
```

## Other errors

Any other failure (malformed body 400, not logged in 401, rate limited 429,
server failure 500, ...) uses
`about:blank` with a `detail` for the user:

```
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json

{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "The food could not be saved. Try again."
}
```

This covers every failure, including the 401 from the auth middleware
(`RequireAuth`), the 429 from the rate limiter and the 500 from panic
recovery.

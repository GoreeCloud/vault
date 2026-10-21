# GoreeCloud Vault — CLI API-key input isolation

**Development only. Authentication, server tenancy, and secret safety not approved.**

The imported Bitwarden CLI read `BW_CLIENTID` and `BW_CLIENTSECRET` when
handling `login --apikey`. If users kept upstream Bitwarden credentials in
their shell, the independently maintained GoreeCloud Fork could consume them
implicitly, potentially attempting authentication against a service not yet
validated for GoreeCloud.

The GoreeCloud CLI now reads only `GOREECLOUD_VAULT_CLIENT_ID` and
`GOREECLOUD_VAULT_CLIENT_SECRET` as its API-key environment inputs. An
upstream-only pair is ignored, resulting in an explicit missing-client-id
error in the noninteractive flow. If both sets exist, only GoreeCloud's pair
is passed into the existing API-key authentication path. The normal interactive
prompt and explicit in-program `clientSecret` continue to work as before.

The existing login-command Jest suite uses **synthetic credentials** to test
those boundaries, missing/empty/whitespace and organization IDs, error
handling, and successful credential dispatch. New static checks in the
read-only source-integrity workflow flag accidental use of the inherited
`BW_CLIENTID` or `BW_CLIENTSECRET` in the login implementation.

## Important limitations

- This does **not** make any real API-key login safe. Default server endpoint,
  identity provider and organizational authority still require separation,
  authenticated testing and cryptographic/security review.
- Existing Bitwarden environmental variables are not removed from the user's
  shell; they are ignored by this fork. No automatic migration, disclosure,
  credential reuse, or account-access attempt is authorized.
- This change depends on the independent `GOREECLOUD_VAULT_SESSION` migration
  in issue #13. Never silently alias session or API-key variables back to
  upstream Bitwarden names.
- `node-forge` high-severity advisory and all product release gates remain
  open (#8, #3). No production deployment or real-secret tests.

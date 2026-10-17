# Branches to delete (restorable)

Approved for deletion on 2026-10-16 (audit). The session proxy blocks branch deletion (git push --delete and the REST API both refused), so the owner deletes them on GitHub (Branches page); delete this file's rows once they are gone. Every tip below is an ancestor of `main`, so nothing is lost; restore one with `git push origin <sha>:refs/heads/<name>`. Kept: the newest 3 backups (backup/v0.48.2 backup/v0.49.0 backup/v0.52.0; v0.48.1 added to the list on 2026-10-16 in v0.52.0) and the branches with commits that are not on `main` (ccr-02a49245-ka3fde, claude/stoic-feynman-241ju4, draft/token-projection).

| Branch | SHA |
|---|---|
| backup/pre-roadmap-2026-10-14 | 501ee2bfc4815dd8e91bb5c17221e51d0dbcb426 |
| backup/pre-v0.34.2 | 136ddd932decd19bc5231e823e0ab930a4a9df35 |
| backup/pre-v0.37.0 | b5b810e59d6ad0e466001c913d004cf84e195429 |
| backup/v0.39.0 | c263a484c00f1f677ac88d8889f90d23d0083d4c |
| backup/v0.40.0 | b2a69312af79a52518145a110fc743c30bf30719 |
| backup/v0.40.1 | 9611c7561bf1c1375c8184fe742ecc94ad99fe6b |
| backup/v0.40.2 | 8195efc746420e0ad37c9092770fc9d4769b2b69 |
| backup/v0.40.3 | 855baad35faaa7d191cf8d4004a7d0c83b17e692 |
| backup/v0.41.1 | dd99ae9592f86d4f6d62503207320f8ada5b63b3 |
| backup/v0.41.2 | 2daf98b6e443ad8abf574198b0c12f4e80276f5c |
| backup/v0.41.3 | f0c2f2a2a999cdad386d0531e6b885171b924cc7 |
| backup/v0.41.5 | 7671f4781135295c357ee347eb0753205e11f029 |
| backup/v0.42.0 | 65db6053a85cb9a9a9e689551cb864bc81262608 |
| backup/v0.42.1 | 999d91609fa88e0500916c901d64e2cf2c130371 |
| backup/v0.44.0 | b0759c5d729db8a9b31f040c059a85dae1b38cf3 |
| backup/v0.44.1 | 2b13c7b3abbaed7f95bee0b25e75e4db6fc12224 |
| backup/v0.44.3 | 9e7c6489391ea733d665c57fda1e8178e794609d |
| backup/v0.45.1 | 85bf54b44185f325f848cd9fe15294804b9431cf |
| backup/v0.46.0 | 33c98ac43f8679869d6b09571eb9eb3610e748de |
| backup/v0.47.6 | 4c727cafa7f514e007c7d251d073a8f04f6de2a4 |
| backup/v0.48.0 | 5b14c80c6cb3843e40b8e8191596eeee945e1d8a |
| ccr-2beecad4-gvsb4r | 86344f0ac8b09cb5351088453ae1bd34e92c182c |
| lock/20261016T0011Z | f2ab07f80fe6e8b44c2d1f06889b6c85f28dfc95 |
| wip/v0.29-void | 5ec9bdb1f8983b619f916c7758460b67d0de55d8 |
| backup/v0.48.1 | fda8f5ef331c34fa5137a5eaeb4a9f5381b5cec5 |
| backup/v0.48.2 | 90880ccd478ef8214bbdfad55c722c7e233ebc34 |
| backup/v0.49.0 | 6b6e0e2d7c9553fb3db2bc50e753d8b569c60c31 |

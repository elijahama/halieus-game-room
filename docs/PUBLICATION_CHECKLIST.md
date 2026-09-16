# Public Repository Checklist

Before changing the HGR repository from private to public:

## Security

- [ ] No SSH/private keys
- [ ] No real `.env` secrets
- [ ] No cloud/API credentials
- [ ] No production player/account/session data
- [ ] No runtime databases
- [ ] No invite/recovery secrets
- [ ] No private backups
- [ ] No machine-specific operator files
- [ ] No sensitive values in Git history

## Repository quality

- [ ] README reflects the current product
- [ ] Architecture documentation matches the current code
- [ ] Game catalogue is current
- [ ] Local-development instructions are tested
- [ ] Build/test commands are accurate
- [ ] AI-assisted development is disclosed accurately
- [ ] Obsolete internal documentation is excluded

## Screenshots

- [ ] Use real HGR screenshots rather than generated mockups
- [ ] Check usernames before publication
- [ ] Check room codes before publication
- [ ] Check invite codes and private messages
- [ ] Check browser/address-bar information
- [ ] Confirm every screenshot still represents the current UI

## Production boundary

- [ ] Repository-only files do not become mandatory Oracle build inputs
- [ ] Runtime data remains outside replaceable application releases
- [ ] Candidate deployment still fails safely without replacing production

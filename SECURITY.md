# Security policy

Universal Convertor is a static site. Files you convert and dates you enter stay in your browser. The app has no accounts and does not store uploaded files on a server.

## Reporting a vulnerability

Please report privately through [GitHub Security Advisories](https://github.com/emadtoranji/universal-convertor/security/advisories/new).

Include what you did, what you expected, and the browser you used. Give the project a reasonable time to respond before you publish details.

There is no bug bounty.

## In scope

- A way for a crafted file (for example SVG, JSON, or an image) to run script in the visitor's browser beyond what the page already does.
- A way for file contents or the date the user entered to be sent off the device.
- A weakness in the Cloudflare Worker that serves the site, such as serving user content from the wrong cache or weakening the security headers.

## Out of scope

- Bugs in a third-party package that this app does not reach with user input.
- Missing a format, a wrong conversion result, or a visual glitch. Open a normal issue for those.
- Social engineering, physical access to someone's computer, or a compromised browser extension.

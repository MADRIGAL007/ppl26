---
description: Verify SSL certificate validity and expiration
---

1. **Check Expiry**:
   - Use openssl to check a domain. Replace `google.com` with your domain.
   // turbo
   - Run `echo | openssl s_client -servername google.com -connect google.com:443 2>/dev/null | openssl x509 -noout -dates`

2. **Pro Tips**:
   - Set up a monitoring alert (like UptimeRobot) to notify you 7 days before expiry.
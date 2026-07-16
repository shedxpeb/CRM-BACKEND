import { resolveSmtpEndpoint, SmtpDnsError } from './mail.dns';

describe('resolveSmtpEndpoint', () => {
  it('keeps IPv4 literals unchanged', async () => {
    const result = await resolveSmtpEndpoint('142.250.0.1', 4);
    expect(result.connectHost).toBe('142.250.0.1');
    expect(result.family).toBe(4);
    expect(result.resolvedAddress).toBe('142.250.0.1');
  });

  it('resolves smtp.gmail.com to an IPv4 address when family=4', async () => {
    const result = await resolveSmtpEndpoint('smtp.gmail.com', 4, 5_000);
    expect(result.hostname).toBe('smtp.gmail.com');
    expect(result.family).toBe(4);
    expect(result.resolvedAddress).toMatch(/^\d{1,3}(\.\d{1,3}){3}$/);
    expect(result.connectHost).toBe(result.resolvedAddress);
  });

  it('rejects IPv6 literals when family=4', async () => {
    await expect(resolveSmtpEndpoint('2607:f8b0:400e:c1e::6d', 4)).rejects.toBeInstanceOf(SmtpDnsError);
  });

  it('fails hard on unknown host when family=4 (no hostname fallback)', async () => {
    await expect(
      resolveSmtpEndpoint('this-host-definitely-does-not-exist.invalid', 4, 2_000),
    ).rejects.toBeInstanceOf(SmtpDnsError);
  });
});

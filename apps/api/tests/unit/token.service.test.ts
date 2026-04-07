import { signAccessToken, verifyAccessToken } from '../../src/services/token.service';

// Mock env for testing
process.env.JWT_SECRET = 'test_secret_for_unit_tests_1234567890';

describe('Token Service', () => {
  const payload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'USER' as const,
  };

  test('should sign and verify access token', () => {
    const token = signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  test('should throw error on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.string')).toThrow();
  });
});

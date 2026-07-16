import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  it('throws when JWT_SECRET is not defined', () => {
    delete process.env.JWT_SECRET;

    expect(() => new JwtStrategy()).toThrow('JWT_SECRET');
  });

  it('returns validated payload fields', async () => {
    process.env.JWT_SECRET = 'test-secret';
    const strategy = new JwtStrategy();
    const payload: JwtPayload = {
      userId: 'u1',
      userName: 'User',
      userEmail: 'user@test.com',
      companyId: 'c1',
      companyName: 'Comp',
      slug: 'comp',
      companyAvatar: 'avatar.png',
      accessRules: [{ module: 'orders', action: 'read' }],
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      userId: 'u1',
      userName: 'User',
      companyId: 'c1',
      companyName: 'Comp',
      companyAvatar: 'avatar.png',
      accessRules: payload.accessRules,
    });
  });
});

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DRIZZLE } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        fullname: schema.users.fullname,
      })
      .from(schema.users)
      .where(eq(schema.users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException();
    return user;
  }
}

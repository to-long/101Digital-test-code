import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AUTH_COOKIE_NAME } from './jwt.strategy';

// JWT lives in an httpOnly cookie so XSS can't steal it. We mirror the
// JWT_EXPIRATION env (seconds) into the cookie's maxAge (ms) so the
// browser drops the cookie at the same instant the token would expire.
function authCookieOptions() {
  const expirySeconds = Number(process.env.JWT_EXPIRATION || 3600);
  return {
    httpOnly: true,
    sameSite: 'lax' as const, // CSRF mitigation; lax is fine since this is a same-site app
    secure: process.env.NODE_ENV === 'production', // require HTTPS in prod
    maxAge: expirySeconds * 1000,
    path: '/',
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user; sets httpOnly auth cookie and also returns JWT in body' })
  @ApiResponse({ status: 201, description: 'Authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    // Browser path: set the httpOnly cookie. Non-browser clients (curl,
    // tests) can still use the accessToken in the body via Bearer.
    res.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions());
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the auth cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    // clearCookie must use the SAME options (path/sameSite/secure) as the
    // original Set-Cookie or the browser won't match it.
    const { maxAge: _maxAge, ...clearOpts } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, clearOpts);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return current authenticated user profile' })
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }
}

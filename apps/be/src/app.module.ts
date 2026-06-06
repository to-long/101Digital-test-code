import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [DbModule, AuthModule, InvoicesModule],
})
export class AppModule {}

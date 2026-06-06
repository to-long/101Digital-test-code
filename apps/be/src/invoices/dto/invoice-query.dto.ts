import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InvoiceQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ enum: ['invoiceDate', 'dueDate', 'totalAmount'] })
  @IsOptional()
  @IsEnum(['invoiceDate', 'dueDate', 'totalAmount'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  ordering?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ enum: ['Draft', 'Pending', 'Paid', 'Overdue'] })
  @IsOptional()
  @IsEnum(['Draft', 'Pending', 'Paid', 'Overdue'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by invoice number or customer name' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Filter invoices on/after this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter invoices on/before this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  toDate?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class CustomerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+61400000000' })
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional({ example: 'Sydney, Australia' })
  @IsOptional()
  @IsString()
  address?: string;
}

class InvoiceItemDto {
  @ApiProperty({ example: 'Web Development Service' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 1500.0 })
  @IsNumber()
  @IsPositive()
  rate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({ example: 'INV-001' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiPropertyOptional({ example: '#REF-123' })
  @IsOptional()
  @IsString()
  invoiceReference?: string;

  @ApiProperty({ example: '2026-06-05' })
  @IsString()
  @IsNotEmpty()
  invoiceDate: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ enum: ['AUD', 'USD', 'GBP'], example: 'AUD' })
  @IsEnum(['AUD', 'USD', 'GBP'])
  currency: string;

  @ApiPropertyOptional({ example: 'Invoice for web development' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: InvoiceItemDto })
  @ValidateNested()
  @Type(() => InvoiceItemDto)
  item: InvoiceItemDto;

  @ApiProperty({ example: 10, default: 10 })
  @IsNumber()
  @Min(0)
  taxPercent = 10;

  @ApiProperty({ example: 0, default: 0 })
  @IsNumber()
  @Min(0)
  discount = 0;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with search, filter, sort, pagination' })
  async list(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail by ID' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @ApiResponse({ status: 409, description: 'Invoice number already exists' })
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: { id: string }) {
    return this.invoicesService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  @ApiResponse({ status: 400, description: 'Paid invoices cannot be modified' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an invoice (sets deletedAt)' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  @ApiResponse({ status: 400, description: 'Paid invoices cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.invoicesService.softDelete(id);
  }
}

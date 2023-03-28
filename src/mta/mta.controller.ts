import { Controller, Get } from '@nestjs/common';
import { MtaService } from './mta.service';

@Controller('mta')
export class MtaController {
  constructor(private mtaService: MtaService) {}

  @Get()
  getTrain() {
    return this.mtaService.getTrain();
  }
}

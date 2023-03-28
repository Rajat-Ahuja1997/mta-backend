import { Module } from '@nestjs/common';
import { MtaService } from './mta.service';
import { MtaController } from './mta.controller';

@Module({
  providers: [MtaService],
  controllers: [MtaController],
})
export class MtaModule {}

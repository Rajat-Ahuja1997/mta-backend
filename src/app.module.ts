import { Module } from '@nestjs/common';
import { MtaModule } from './mta/mta.module';

@Module({
  imports: [MtaModule],
})
export class AppModule {}

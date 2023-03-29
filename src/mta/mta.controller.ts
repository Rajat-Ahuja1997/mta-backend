import { Controller, Get, Query } from '@nestjs/common';
import { MtaService } from './mta.service';

@Controller('mta')
export class MtaController {
  constructor(private mtaService: MtaService) {}

  // get train by line where line is passed by query param
  @Get('/trains')
  getTrainByLine(@Query('line') line: string) {
    return this.mtaService.getTrain(line);
  }

  // get all trains
  @Get()
  getTrains() {
    return this.mtaService.getTrains();
  }

  // get all stations
  @Get('/stations')
  getStations() {
    return this.mtaService.getStations();
  }

  // cron job to update trains every minute
  @Get('/update')
  updateTrains() {
    return this.mtaService.updateTrains();
  }
}

import { Injectable } from '@nestjs/common';
import * as protobuf from 'protobufjs';
import * as stationsJson from './stations.json';
import { writeFile } from 'fs/promises';
import { TRAIN_URL } from './feed-urls';
import fetch from 'node-fetch';

@Injectable()
export class MtaService {
  
  private root;
  private FeedMessage;
  private trains = [];

  constructor() {
    this.root = protobuf.loadSync([
      'proto/gtfs-realtime.proto',
      'proto/nyct-subway.proto',
    ]);
    this.FeedMessage = this.root.lookupType('transit_realtime.FeedMessage');
  }

  urls = [
    'L',
    'NQRW',
    'BDFM',
    'ACE',
    'JZ',
    'G',
    'NUMBERED',
  ];

  feedUrls = [
    TRAIN_URL.L,
    TRAIN_URL.NQRW,
    TRAIN_URL.BDFM,
    TRAIN_URL.ACE,
    TRAIN_URL.JZ,
    TRAIN_URL.G,
    TRAIN_URL.NUMBERED,
  ];

  // load all trains from mta api from constructor
  async loadTrains() {
    for (const url of this.feedUrls) {
      console.log(url);
      const train = await this.getTrain(url);
      this.trains.push(train);
    }
    return this.trains;
  }

  // cron job to update trains every minute
  async updateTrains() {
    const trains = await this.loadTrains();
  }

  // get all trains from mta api
  async getTrains() {
    const trains = [];
    for (const url of this.urls) {
      console.log(url);
      const train = await this.getTrain(url);
      trains.push(train);
    }
    console.log(trains.length);
    return trains[3];
  }

  //https://api.mta.info/#/subwayRealTimeFeeds
  async getTrain(url: string): Promise<any> {
    let trainUrl = '';
    if (url === 'L') {
      trainUrl = TRAIN_URL.L;
    } else if (url === 'NQRW') {
      trainUrl = TRAIN_URL.NQRW;
    } else if (url === 'BDFM') {
      trainUrl = TRAIN_URL.BDFM;
    } else if (url === 'ACE') {
      trainUrl = TRAIN_URL.ACE;
    } else if (url === 'JZ') {
      trainUrl = TRAIN_URL.JZ;
    } else if (url === 'G') {
      trainUrl = TRAIN_URL.G;
    } else if (url === 'NUMBERED') {
      trainUrl = TRAIN_URL.NUMBERED;
    } else {
      trainUrl = TRAIN_URL.L;
    }

    const response = await fetch(trainUrl, {
      headers: {
        'x-api-key': 'OhiIwruKi0avA98lwhGi125DN9CGHGAo6HWF7If8',
      },
    });

    const buffer = await response.arrayBuffer();
    const feed = this.FeedMessage.decode(new Uint8Array(buffer));
    const message = this.FeedMessage.toObject(feed, {
      longs: String,
      enums: String,
      bytes: String,
    });

    const trains = this.parseTrainData(message);
    const stopId = 'L06';
    const filteredData = trains.filter(obj => obj.stopUpdates.some(stop => stop.stopId === stopId));
    return trains;
    // return filteredData
    // return message.entity;
  }

  parseTrainData = (message) => {
    const trains = message.entity.map((train) => {
      const line =
        train?.tripUpdate?.trip?.routeId ?? train?.vehicle?.trip?.routeId;

      const stopUpdates =
        train?.tripUpdate?.stopTimeUpdate?.map((stopUpdate) => {
          return {
            arrivalTime: `${this.calculateTimeDifference(
              stopUpdate?.arrival?.time ?? stopUpdate?.departure?.time,
            )} minutes`,
            stopId: stopUpdate?.stopId?.slice(0, -1),
            location:
              stationsJson[stopUpdate?.stopId?.slice(0, -1)]?.name ?? null,
            direction: stopUpdate?.stopId.endsWith('S')
              ? 'South'
              : stopUpdate?.stopId.endsWith('N')
              ? 'North'
              : null,
          };
        }) ?? [];

      const vehicleStopId = train?.vehicle?.stopId;

      if (
        vehicleStopId &&
        !stopUpdates.some((update) => update.stopId === vehicleStopId)
      ) {
        stopUpdates.push({
          stopId: vehicleStopId?.slice(0, -1),
          direction: vehicleStopId?.endsWith('S')
            ? 'South'
            : vehicleStopId?.endsWith('N')
            ? 'North'
            : null,
          location: stationsJson[vehicleStopId?.slice(0, -1)]?.name ?? null,
          arrivalTime: `${this.calculateTimeDifference(
            train?.vehicle?.timestamp,
          )} minutes`,
          currentStatus: train?.vehicle?.currentStatus,
        });
      }

      return {
        line,
        stopUpdates,
      };
    });
    return trains;
  };

  /**
   * @returns minutes until timestamp
   */
  calculateTimeDifference = (timestamp: number) => {
    timestamp = timestamp * 1000;
    const now = Date.now();
    const diff = timestamp - now; // calculate the difference in milliseconds
    const minutes = Math.round(diff / (1000 * 60)); // convert milliseconds to minutes and round to the nearest integer
    return minutes;
  };

  async unused() {
    const newObj = {};

    // Loop through the keys in the original object
    for (const key in stationsJson) {
      // Get the new keys from the "stops" object
      const newKeys = Object.keys(stationsJson[key].stops);

      // Loop through the new keys and add a new property to the new object for each key
      for (const newKey of newKeys) {
        newObj[newKey] = { ...stationsJson[key] };

        // Update the "id" property to match the new key
        newObj[newKey].id = newKey;

        // Remove the "stops" property
        delete newObj[newKey].stops;
      }
    }

    // Convert the new object to a JSON string
    const newJson = JSON.stringify(newObj, null, 2);
    await writeFile('output.json', newJson);
  }
}

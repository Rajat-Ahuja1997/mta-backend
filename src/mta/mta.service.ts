import { Injectable } from '@nestjs/common';
import * as protobuf from 'protobufjs';
import * as stationsJson from './stations.json';
import { writeFile } from 'fs/promises';
import { TRAIN_URL } from './feed-urls';

@Injectable()
export class MtaService {
  feedUrls = [
    TRAIN_URL.L,
    TRAIN_URL.NQRW,
    TRAIN_URL.BDFM,
    TRAIN_URL.ACE,
    TRAIN_URL.JZ,
    TRAIN_URL.SIR,
    TRAIN_URL.G,
    TRAIN_URL.NUMBERED,
  ];
  async getTrain() {
    //add x-api-key to headers
    //https://api.mta.info/#/subwayRealTimeFeeds
    const response = await fetch(TRAIN_URL.L, {
      headers: {
        'x-api-key': 'OhiIwruKi0avA98lwhGi125DN9CGHGAo6HWF7If8',
      },
    });

    console.log(stationsJson);

    const buffer = await response.arrayBuffer();
    const root = await protobuf.load([
      'proto/gtfs-realtime.proto',
      'proto/nyct-subway.proto',
    ]);
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
    const feed = FeedMessage.decode(new Uint8Array(buffer));
    const message = FeedMessage.toObject(feed, {
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

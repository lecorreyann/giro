export type VehicleType = 'bike' | 'escooter' | 'scooter' | 'car';

export type Coord = { lat: number; lng: number };

export type Stop = {
  id: string;
  address: string;
  time: string;
  coord?: Coord;
  suggestedIndex?: number;
};

export type RoutePlan = {
  vehicle: VehicleType;
  departureAt: Date;
  origin: string;
  originCoord?: Coord;
  stops: Stop[];
  preserveOrder?: boolean;
};

export type TurnInstruction = {
  text: string;
  maneuver?: string;
  coord?: Coord;
  routeOffsetMeters: number;
};

export type RouteLeg = {
  fromAddress: string;
  toAddress: string;
  distanceMeters: number;
  baseDurationSeconds: number;
  trafficDurationSeconds: number;
  arrivalAt: Date;
  geometry: Coord[];
  instructions: TurnInstruction[];
};

export type RouteResult = {
  vehicle: VehicleType;
  departureAt: Date;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalTrafficDelaySeconds: number;
  legs: RouteLeg[];
  orderedStopIds: string[];
};

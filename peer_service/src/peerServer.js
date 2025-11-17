//import dotenv from "dotenv";
import { PeerServer } from "peer";
//const { PeerServer } = require("peer");
const peerServer = PeerServer({port: 9000, path: "/zlowServer", allow_discovery: true})
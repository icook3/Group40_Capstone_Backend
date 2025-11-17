//import dotenv from "dotenv";
import { PeerServer } from "peer";
const peerServer = PeerServer({port: 9000, path: "/zlowServer", allow_discovery: true})
var httpProxy = require("http-proxy");
var http = require("http");
var url = require("url");
var net = require('net');
var fs = require('fs')
var filename =new Date().toLocaleString().split("/").join("-").split(":").join("-").replace(", ","T").substring(0,19).trim() +".log"
console.log(filename);
const uniqueDomains = new Set();
var server = http.createServer(function (req, res) {
    var urlObj = url.parse(req.url);
    var target = urlObj.protocol + "//" + urlObj.host;
    console.log("Proxying HTTP request for:" + target + " " + urlObj.port);
    log(urlObj.host);
    var proxy = httpProxy.createProxyServer({});
    proxy.on("error", function (err, req, res) {
        console.log("proxy error", err);
        res.end();
    });
    proxy.web(req, res, { target: target });
}).listen(8080);  //this is the port your clients will connect to


server.addListener('connect', function (req, socket, bodyhead) {
    var hostPort = getHostPortFromString(req.url, 443);
    var hostDomain = hostPort[0];
    var port = parseInt(hostPort[1]);
    console.log("Proxying HTTPS request for:", hostDomain, port);
    log(hostDomain);

    var package = "HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n";
    var proxySocket = new net.Socket();
    proxySocket.connect(port, hostDomain, function () {
        proxySocket.write(bodyhead);
        socket.write(package);
    }
    );

    proxySocket.on('data', function (chunk) {
        socket.write(chunk);
    });

    proxySocket.on('end', function () {
        socket.end();
    });

    proxySocket.on('error', function () {
        socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
        socket.end();
    });

    socket.on('data', function (chunk) {
        proxySocket.write(chunk);
    });

    socket.on('end', function () {
        proxySocket.end();
    });

    socket.on('error', function () {
        proxySocket.end();
    });

});


function log(target) {
    if (!uniqueDomains.has(target)) {
        fs.appendFile(filename, target + "\n", function (err) {
            if (err) {
                // append failed
            } else {
                // done
            }
        });
        uniqueDomains.add(target)
    }
}
var regex_hostport = /^([^:]+)(:([0-9]+))?$/;

var getHostPortFromString = function (hostString, defaultPort) {
    var host = hostString;
    var port = defaultPort;

    var result = regex_hostport.exec(hostString);
    if (result != null) {
        host = result[1];
        if (result[2] != null) {
            port = result[3];
        }
    }

    return ([host, port]);
};

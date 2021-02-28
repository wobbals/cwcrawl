import assert from "assert";
import config from "config";
import Crawler from "crawler";
import fs from "fs";

const ENTRYPOINT: string = config.get("entrypoint");
const ALLOWED_DOMAINS: string[] = config.get("allowed_domains");
const SEARCH_TERMS: string[] = config.get("search_terms");

const knownPages = new Set<string>();
let visitedPages = 0;

const OF = "output.csv";
let header = `page,`;
SEARCH_TERMS.forEach((term) => (header += `${term},`));
header += "\n";
fs.writeFileSync(OF, header, { encoding: "utf8" });

const c = new Crawler({
  maxConnections: 1,
  rateLimit: 1000,
  // This will be called for each crawled page
  callback: function (error, res, done) {
    if (error || !res.request) {
      done();
      return;
    }
    const { uri } = res.request;
    // console.log(uri);
    visitedPages += 1;
    console.log(
      `Visited ${uri.href} (${visitedPages}/${c.queueSize}/${knownPages.size})`
    );
    assert(uri.pathname);
    knownPages.add(uri.pathname);
    if (typeof res.$ === "function") {
      res.$("a").each((i, a: cheerio.Element) => {
        // only look at anchor tags
        if (a.type !== "tag") {
          return;
        }
        // only look at tags to http URLs
        if (!(a.attribs.href && a.attribs.href.startsWith("http"))) {
          return;
        }
        const linkURL = new URL(a.attribs.href);
        const allowedDomain = ALLOWED_DOMAINS.find((domain) =>
          linkURL.hostname.endsWith(domain)
        );
        // only look at URLs in allowed domains list
        if (!allowedDomain) {
          return;
        }
        // only look at URLs we haven't already visited
        if (linkURL.pathname && !knownPages.has(linkURL.pathname)) {
          //console.log(url);
          knownPages.add(linkURL.pathname);
          c.queue(linkURL.href);
        }
      });
    }
    const body = res.body.toString().toLowerCase();
    let line = `${uri.href},`;
    SEARCH_TERMS.forEach((term) => {
      const count = (body.match(new RegExp(term, "g")) || []).length;
      if (body.includes(term)) {
        console.log(`  ${uri.pathname} has ${term} (n=${count})`);
      }
      line += `${count},`;
    });
    line += "\n";
    fs.appendFileSync(OF, line, { encoding: "utf8" });
    done();
  },
});

c.queue(ENTRYPOINT);

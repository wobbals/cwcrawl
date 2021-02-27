import config from "config";
import Crawler from "crawler";

const ENTRYPOINT: string = config.get("entrypoint");
const ALLOWED_DOMAINS: string[] = config.get("allowed_domains");
const SEARCH_TERMS: string[] = config.get("search_terms");

const visitedPages = new Set<string>();

const c = new Crawler({
  maxConnections: 1,
  rateLimit: 1000,
  // This will be called for each crawled page
  callback: function (error, res, done) {
    const { uri } = res.request;
    // console.log(uri);
    console.log(`Visit ${uri.href}`);
    if (uri.pathname) {
      visitedPages.add(uri.pathname);
    }
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
      if (linkURL.pathname && !visitedPages.has(linkURL.pathname)) {
        //console.log(url);
        c.queue(linkURL.href);
      }
    });
    const body = res.body.toString().toLowerCase();
    SEARCH_TERMS.forEach((term) => {
      if (body.includes(term)) {
        console.log(`  ${uri.pathname} is ${term}-y`);
      }
    });
    done();
  },
});

c.queue(ENTRYPOINT);

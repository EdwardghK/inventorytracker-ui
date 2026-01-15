export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isAsset = url.pathname.includes('.') || url.pathname.startsWith('/assets/');
    if (isAsset) {
      return env.ASSETS.fetch(request);
    }
    const indexRequest = new Request(new URL('/index.html', url), request);
    return env.ASSETS.fetch(indexRequest);
  },
};

import { NextResponse } from 'next/server';

// Helper to identify and filter out social media profiles and system/CDN/junk domains
function isJunkDomain(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    
    // 1. Valid shopping/affiliate platform exceptions (always allow these)
    const storeKeywords = [
      'smartstore.naver.com', 
      'brand.naver.com', 
      'shopping.naver.com',
      'blog.naver.com',
      'cafe.naver.com',
      'link.coupang.com',
      'coupang.com'
    ];
    if (storeKeywords.some(store => domain.includes(store))) {
      return false;
    }

    // 2. Junk, CDN, static assets, tracking, and WAF challenge keywords
    const junkKeywords = [
      'cdn', 'static', 'analytics', 'pixel', 'adservice', 'doubleclick', 
      'slardar', 'secsdk', 'bytedance', 'ibytedtos', 'byteoversea', 'tiktokv', 
      'ttwstatic', 'ttlstatic', 'ttlivecdn', 'fbcdn', 'fbsbx', 'ytimg', 
      'ggpht', 'googleusercontent', 'gstatic', 'youtube-nocookie', 'schema.org', 
      'w3.org', 'doubleclick', 'googleadservices', 'googlesyndication', 
      'googletagmanager', 'ampproject', 'attributions', 'sec-sdk', 'waf',
      'byteintl', 'byteimg', 'isnssdk', 'apis.google.com', 'googleapis.com',
      'accounts.google.com', 'support.google.com', 'policies.google.com'
    ];
    if (junkKeywords.some(kw => domain.includes(kw))) {
      return true;
    }

    // 3. Social media platform domains (to avoid linking back to general profiles)
    const socialDomains = [
      'youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com', 
      'twitter.com', 'x.com', 'facebook.com', 'threads.net', 
      'linktr.ee', 'inpock.co.kr', 'kakao.com', 't.me', 'naver.com'
    ];
    if (socialDomains.some(social => domain === social || domain.endsWith('.' + social))) {
      return true;
    }
  } catch (e) {
    return true; // invalid URL is treated as junk
  }
  return false;
}

const YOUTUBE_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function fetchYouTubePageHtml(videoId, preferShorts = false) {
  const candidates = preferShorts
    ? [
        `https://www.youtube.com/shorts/${videoId}`,
        `https://www.youtube.com/watch?v=${videoId}`,
      ]
    : [
        `https://www.youtube.com/watch?v=${videoId}`,
        `https://www.youtube.com/shorts/${videoId}`,
      ];

  for (const pageUrl of candidates) {
    try {
      const res = await fetch(pageUrl, {
        headers: YOUTUBE_FETCH_HEADERS,
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        continue;
      }

      const html = await res.text();
      if (html.includes('shortDescription') || /og:title/i.test(html)) {
        return html;
      }
    } catch {
      // try the alternate YouTube page URL
    }
  }

  return '';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Clean and validate URL format
    let cleanUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    // 1. YouTube link parsing
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const ytMatch = cleanUrl.match(ytRegex);

    if (ytMatch) {
      const videoId = ytMatch[1];
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      let title = 'YouTube Video';
      let partnersUrl = '';
      
      try {
        const isShortsUrl = /youtube\.com\/shorts\//i.test(cleanUrl);
        const html = await fetchYouTubePageHtml(videoId, isShortsUrl);

        if (html) {
          // Parse video title from HTML
          const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                               html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
                               html.match(/<title>(.*?)<\/title>/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            title = ogTitleMatch[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s*-\s*YouTube$/i, '') // remove YouTube suffix
              .trim();
          } else {
            // Fallback to oEmbed for title
            try {
              const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
              const oRes = await fetch(oembedUrl);
              if (oRes.ok) {
                const oData = await oRes.json();
                title = oData.title || title;
              }
            } catch (err) {}
          }
          
          const descMatch = html.match(/"shortDescription":"(.*?)"/);
          
          if (descMatch) {
            // Unescape JSON string values using native parser
            let description = '';
            try {
              description = JSON.parse('"' + descMatch[1] + '"');
            } catch (err) {
              // Fallback for manual replacement if parsing fails
              description = descMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\\\/g, '\\');
            }
              
            const lines = description.split('\n');
            const urlRegex = /(https?:\/\/[^\s"'\\]+)/;
            const tempUrls = [];
            
            for (let line of lines) {
              const match = line.match(urlRegex);
              if (match) {
                const url = match[1];
                
                if (isJunkDomain(url)) {
                  continue;
                }
                
                // Avoid duplicate URLs in the list
                if (!tempUrls.includes(url)) {
                  tempUrls.push(url);
                }
              }
            }
            
            // Only scan channel page when video description has no affiliate links
            if (tempUrls.length === 0) {
            try {
              const channelIdMatch = html.match(/"channelId"\s*:\s*"(UC[A-Za-z0-9_-]{22})"/i) ||
                                     html.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/i);
              if (channelIdMatch && channelIdMatch[1]) {
                const channelId = channelIdMatch[1];
                const channelUrl = `https://www.youtube.com/channel/${channelId}`;
                const channelRes = await fetch(channelUrl, {
                  headers: YOUTUBE_FETCH_HEADERS,
                  signal: AbortSignal.timeout(3000),
                });
                
                if (channelRes.ok) {
                  const channelHtml = await channelRes.text();
                  const rawUrls = channelHtml.match(/(https?:\/\/[^\s"'\\]+)/g) || [];
                  
                  for (let rawUrl of rawUrls) {
                    let resolvedUrl = rawUrl.split(/[?"'\\]/)[0];
                    
                    // Unescape/resolve youtube redirect links
                    if (resolvedUrl.includes('youtube.com/redirect') || resolvedUrl.includes('youtube.com/attribution_link')) {
                      try {
                        const urlObj = new URL(rawUrl);
                        const redirectUrl = urlObj.searchParams.get('q');
                        if (redirectUrl) {
                          resolvedUrl = redirectUrl;
                        }
                      } catch (e) {}
                    }
                    
                    if (isJunkDomain(resolvedUrl)) {
                      continue;
                    }
                    
                    if (!tempUrls.includes(resolvedUrl)) {
                      tempUrls.push(resolvedUrl);
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Failed to parse channel profile links:', err);
            }
            }
            
            // Concurrently fetch page/browser titles for the links (up to 2)
            const detectedLinks = await Promise.all(
              tempUrls.slice(0, 2).map(async (url) => {
                const title = await fetchWebpageTitle(url);
                return { url, label: title };
              })
            );
            
            // Set the primary partnersUrl using priority
            if (detectedLinks.length > 0) {
              const coupang = detectedLinks.find(item => item.url.includes('link.coupang.com'));
              if (coupang) {
                partnersUrl = coupang.url;
              } else {
                const amazon = detectedLinks.find(item => item.url.includes('amzn.to') || item.url.includes('amazon.to') || item.url.includes('amazon.com'));
                if (amazon) {
                  partnersUrl = amazon.url;
                } else {
                  const naver = detectedLinks.find(item => item.url.includes('smartstore.naver.com') || item.url.includes('brand.naver.com'));
                  if (naver) {
                    partnersUrl = naver.url;
                  } else {
                    partnersUrl = detectedLinks[0].url;
                  }
                }
              }
              
              // Also return all detected links
              return NextResponse.json({ 
                title, 
                thumbnailUrl, 
                partnersUrl, 
                detectedLinks,
                platform: 'youtube' 
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse YouTube description or fetch oEmbed:', e);
      }

      return NextResponse.json({ title, thumbnailUrl, partnersUrl: '', detectedLinks: [], platform: 'youtube' });
    }

    // 2. TikTok link parsing
    if (cleanUrl.includes('tiktok.com')) {
      let title = 'TikTok Video';
      let thumbnailUrl = '';
      let partnersUrl = '';
      let detectedLinks = [];

      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data = await res.json();
          title = data.title || 'TikTok Video';
          thumbnailUrl = data.thumbnail_url || '';
        }
      } catch (e) {
        console.error('Failed to fetch TikTok oEmbed:', e);
      }

      // Try to parse creator name and fetch TikTok profile page for links
      try {
        const creatorMatch = cleanUrl.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/);
        if (creatorMatch && creatorMatch[1]) {
          const username = creatorMatch[1];
          const profileUrl = `https://www.tiktok.com/@${username}`;
          console.log('Fetching TikTok profile page:', profileUrl);
          const profileRes = await fetch(profileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
              'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(4000)
          });

          if (profileRes.ok) {
            const profileHtml = await profileRes.text();
            const tempUrls = [];

            // 1. Direct match for TikTok's native bioLink JSON property
            const bioLinkMatch = profileHtml.match(/"bioLink"\s*:\s*\{\s*"link"\s*:\s*"(.*?)"/);
            if (bioLinkMatch && bioLinkMatch[1]) {
              const cleanBioUrl = bioLinkMatch[1].replace(/\\u002F/g, '/').replace(/\\u002f/g, '/');
              try {
                const domain = new URL(cleanBioUrl).hostname.toLowerCase();
                const systemKeywords = ['cdn', 'static', 'ttwstatic', 'secsdk', 'slardar', 'bytedance', 'ibytedtos'];
                if (!systemKeywords.some(kw => domain.includes(kw))) {
                  tempUrls.push(cleanBioUrl);
                }
              } catch(e) {}
            } else {
              // 2. Fallback regex scraping for other URLs only if bioLink is not found
              const rawUrls = profileHtml.match(/(https?:\/\/[^\s"'\\]+)/g) || [];
              for (let rawUrl of rawUrls) {
                let cleanUrl = rawUrl.split(/[?"'\\]/)[0];
                if (!isJunkDomain(cleanUrl)) {
                  if (!tempUrls.includes(cleanUrl)) {
                    tempUrls.push(cleanUrl);
                  }
                }
              }
            }

            if (tempUrls.length > 0) {
              detectedLinks = await Promise.all(
                tempUrls.slice(0, 2).map(async (url) => {
                  const title = await fetchWebpageTitle(url);
                  return { url, label: title };
                })
              );
              
              const coupang = detectedLinks.find(item => item.url.includes('link.coupang.com'));
              if (coupang) {
                partnersUrl = coupang.url;
              } else {
                partnersUrl = detectedLinks[0].url;
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse TikTok profile links:', err);
      }

      return NextResponse.json({
        title,
        thumbnailUrl,
        partnersUrl,
        detectedLinks,
        platform: 'tiktok'
      });
    }

    // 3. Fallback for general website scraping (Coupang, Instagram, Blogs, etc.)
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse og:title
    let title = '';
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1];
    } else {
      const titleTagMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleTagMatch) {
        title = titleTagMatch[1];
      } else {
        title = 'Shared Link';
      }
    }

    // Parse og:image
    let thumbnailUrl = '';
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);
    if (ogImageMatch) {
      thumbnailUrl = ogImageMatch[1];
    }

    // Decode basic HTML entities in title
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // If it's an Instagram post/reel, try to fetch the profile links too
    let detectedLinks = [];
    let partnersUrl = '';
    
    if (cleanUrl.includes('instagram.com')) {
      try {
        // Find username in post HTML
        const igUserMatch = html.match(/"username"\s*:\s*"(.*?)"/) ||
                            html.match(/instagram\.com\/([A-Za-z0-9_.-]+)\//) ||
                            html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?) on Instagram/i);
                            
        if (igUserMatch && igUserMatch[1]) {
          const username = igUserMatch[1].trim();
          const profileUrl = `https://www.instagram.com/${username}/`;
          console.log('Fetching Instagram profile page:', profileUrl);
          const profileRes = await fetch(profileUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
              'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(4000)
          });
          
          if (profileRes.ok) {
            const profileHtml = await profileRes.text();
            const tempUrls = [];

            // 1. Direct match for Instagram's native external_url JSON property
            const extUrlMatch = profileHtml.match(/"external_url"\s*:\s*"(.*?)"/);
            if (extUrlMatch && extUrlMatch[1]) {
              const cleanExtUrl = extUrlMatch[1].replace(/\\u002F/g, '/').replace(/\\u002f/g, '/');
              try {
                const domain = new URL(cleanExtUrl).hostname.toLowerCase();
                const systemKeywords = ['cdn', 'static', 'ttwstatic', 'secsdk', 'slardar', 'bytedance', 'ibytedtos'];
                if (!systemKeywords.some(kw => domain.includes(kw))) {
                  tempUrls.push(cleanExtUrl);
                }
              } catch(e) {}
            } else {
              // 2. Fallback regex scraping for other URLs only if external_url is not found
              const rawUrls = profileHtml.match(/(https?:\/\/[^\s"'\\]+)/g) || [];
              for (let rawUrl of rawUrls) {
                let cleanUrl = rawUrl.split(/[?"'\\]/)[0];
                if (!isJunkDomain(cleanUrl)) {
                  if (!tempUrls.includes(cleanUrl)) {
                    tempUrls.push(cleanUrl);
                  }
                }
              }
            }
            
            if (tempUrls.length > 0) {
              detectedLinks = await Promise.all(
                tempUrls.slice(0, 2).map(async (url) => {
                  const title = await fetchWebpageTitle(url);
                  return { url, label: title };
                })
              );
              
              const coupang = detectedLinks.find(item => item.url.includes('link.coupang.com'));
              if (coupang) {
                partnersUrl = coupang.url;
              } else {
                partnersUrl = detectedLinks[0].url;
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse Instagram profile links:', err);
      }
    }

    return NextResponse.json({
      title: title.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      partnersUrl,
      detectedLinks,
      platform: cleanUrl.includes('instagram.com') ? 'instagram' : 'general'
    });

  } catch (error) {
    console.error('Metadata scraping failed:', error);
    return NextResponse.json({
      title: '링크',
      thumbnailUrl: '',
      platform: 'general',
      warning: 'Could not scrape metadata: ' + error.message
    });
  }
}

// Helper to fetch target webpage and scrape its title (what shows in the browser tab)
async function fetchWebpageTitle(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(5000) // Timeout after 5s to prevent hanging
    });

    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        
        // Clean up common suffixes for clean buttons
        title = title
          .replace(/\s*-\s*쿠팡!$/i, '')
          .replace(/\s*:\s*네이버\s*쇼핑$/i, '')
          .replace(/\s*:\s*네이버\s*스마트스토어$/i, '')
          .replace(/\s*\|\s*.*$/g, ''); // strip tailing pipes
        
        if (title) return title;
      }
    }
  } catch (e) {
    console.error(`Failed to fetch title for ${url}:`, e);
  }

  // Fallback to domain name if fetch/title parsing fails
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./i, '');
  } catch (e) {
    return '링크';
  }
}

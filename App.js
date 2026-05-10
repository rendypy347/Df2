import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Image, TextInput,
  ScrollView, Dimensions, SafeAreaView, RefreshControl, Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';

const API = 'https://df21.biz.id/wp-json/df21/v1';
const { width: SW } = Dimensions.get('window');
const FILM_W = (SW - 40) / 3;

// ── WARNA ────────────────────────────────────────────────────
const C = {
  bg:'#080a0f', surface:'#0f1319', card:'#141921', border:'#1c2333',
  green:'#00f070', greenDim:'rgba(0,240,112,0.12)',
  red:'#ff2d55', redDim:'rgba(255,45,85,0.12)',
  blue:'#0a84ff', gold:'#ffd60a', orange:'#ff9f0a',
  text:'#eef0f5', muted:'#5a6478',
};

const QCOLOR = {'4K':'#a855f7','Full HD':C.blue,'HD':C.green,'JAV':'#e91e8c','Lokal':C.red,'BluRay':C.blue,'WEB-DL':C.blue,'CAM':C.orange,'TS':C.orange,'HDTS':C.orange};
const CAT = {sepakbola:'⚽',basketball:'🏀',badminton:'🏸',motorsport:'🏎️',tinju:'🥊',mma:'🤼',ufc:'🏆',smackdown:'💪',tenis:'🎾',voli:'🏐',lainnya:'🎯'};

function fmtDate(d) {
  if (!d) return '';
  const days=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const dt = new Date(d + 'T00:00:00+07:00');
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]}`;
}

// ── MATCH STATE (client-side) ────────────────────────────────
function getMatchState(match) {
  if (!match.match_date || !match.kickoff) return 'upcoming';
  const [h,m]    = match.kickoff.split(':').map(Number);
  const [y,mo,d] = match.match_date.split('-').map(Number);
  const start    = Date.UTC(y, mo-1, d, h-7, m);
  const end      = start + (match.duration||2) * 3600000;
  const now      = Date.now();
  if (now >= start && now <= end) return 'live';
  if (now > end) return 'ended';
  return 'upcoming';
}

function getCountdown(match) {
  const [h,m]    = (match.kickoff||'00:00').split(':').map(Number);
  const [y,mo,d] = (match.match_date||'2099-01-01').split('-').map(Number);
  const diff     = Date.UTC(y,mo-1,d,h-7,m) - Date.now();
  if (diff <= 0) return null;
  const hh=Math.floor(diff/3600000), mm=Math.floor((diff%3600000)/60000), ss=Math.floor((diff%60000)/1000);
  if (hh >= 24) return `${Math.floor(hh/24)}h ${hh%24}j`;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// ══════════════════════════════════════════════════════════════
// BADGE STATUS MATCH
// ══════════════════════════════════════════════════════════════
function MatchBadge({ match }) {
  const [state, setState] = useState(() => getMatchState(match));
  const [cd, setCd]       = useState(() => getCountdown(match));
  useEffect(() => {
    const t = setInterval(() => {
      setState(getMatchState(match));
      setCd(getCountdown(match));
    }, 1000);
    return () => clearInterval(t);
  }, [match]);

  if (state === 'live') return (
    <View style={[s.badge, {backgroundColor:C.redDim, borderColor:'rgba(255,45,85,0.3)'}]}>
      <View style={s.dot}/><Text style={[s.badgeTxt, {color:C.red}]}>LIVE</Text>
    </View>
  );
  if (state === 'ended') return (
    <View style={[s.badge, {backgroundColor:'rgba(90,100,120,0.1)', borderColor:C.border}]}>
      <Text style={[s.badgeTxt, {color:C.muted}]}>✅ Selesai</Text>
    </View>
  );
  return (
    <View style={[s.badge, {backgroundColor:'rgba(10,132,255,0.1)', borderColor:'rgba(10,132,255,0.25)'}]}>
      <Text style={[s.badgeTxt, {color:cd ? C.orange : C.blue}]}>{cd ? `⏱ ${cd}` : `⏰ ${match.kickoff} WIB`}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// KARTU MATCH
// ══════════════════════════════════════════════════════════════
function MatchCard({ match, onPress }) {
  const isUrl = u => u && u.startsWith('http');
  return (
    <TouchableOpacity style={s.mc} onPress={() => onPress(match)} activeOpacity={0.82}>
      <View style={s.mcTop}>
        <Text style={s.mcLg} numberOfLines={1}>{CAT[match.category]||'🏆'} {match.league}</Text>
        <MatchBadge match={match}/>
      </View>
      <View style={s.mcBody}>
        <View style={s.mcTeam}>
          <View style={s.mcLogo}>
            {isUrl(match.home_logo)
              ? <Image source={{uri:match.home_logo}} style={s.mcLogoImg}/>
              : <Text style={{fontSize:22}}>{match.home_logo||'🏠'}</Text>}
          </View>
          <Text style={s.mcName} numberOfLines={2}>{match.home_team}</Text>
        </View>
        <View style={s.mcMid}>
          <Text style={s.mcVs}>VS</Text>
          <Text style={s.mcTime}>{fmtDate(match.match_date)}</Text>
        </View>
        <View style={s.mcTeam}>
          <View style={s.mcLogo}>
            {isUrl(match.away_logo)
              ? <Image source={{uri:match.away_logo}} style={s.mcLogoImg}/>
              : <Text style={{fontSize:22}}>{match.away_logo||'✈️'}</Text>}
          </View>
          <Text style={s.mcName} numberOfLines={2}>{match.away_team||'TBD'}</Text>
        </View>
      </View>
      <View style={s.mcBot}>
        <Text style={s.mcDateTxt}>🕐 {match.kickoff} WIB{match.stadium ? ` · ${match.stadium}` : ''}</Text>
        {match.has_stream && <Text style={{color:C.green, fontSize:12, fontWeight:'700'}}>▶ Tonton</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════
// KARTU FILM
// ══════════════════════════════════════════════════════════════
function FilmCard({ film, onPress }) {
  const qc = QCOLOR[film.quality] || C.green;
  return (
    <TouchableOpacity style={{width:FILM_W, margin:4}} onPress={() => onPress(film)} activeOpacity={0.85}>
      <View style={{aspectRatio:2/3, borderRadius:9, overflow:'hidden', backgroundColor:C.card, marginBottom:5}}>
        {film.poster_url
          ? <Image source={{uri:film.poster_url}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>
          : <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:28}}>🎬</Text></View>}
        <View style={{position:'absolute',bottom:4,left:4,backgroundColor:qc,paddingHorizontal:5,paddingVertical:2,borderRadius:4}}>
          <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>{film.quality}</Text>
        </View>
        {film.type==='tv' && (
          <View style={{position:'absolute',top:4,right:4,backgroundColor:C.blue,paddingHorizontal:5,paddingVertical:2,borderRadius:4}}>
            <Text style={{color:'#fff',fontSize:8,fontWeight:'900'}}>SERIES</Text>
          </View>
        )}
      </View>
      <Text style={{color:C.text,fontSize:11,fontWeight:'700',lineHeight:15}} numberOfLines={2}>{film.title}</Text>
      <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:2}}>
        {film.year ? <Text style={{color:C.muted,fontSize:10}}>{film.year}</Text> : null}
        {film.rating ? <Text style={{color:C.gold,fontSize:10}}>⭐{parseFloat(film.rating).toFixed(1)}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════
// STREAM PLAYER (WebView)
// ══════════════════════════════════════════════════════════════
function StreamPlayer({ url }) {
  if (!url) return (
    <View style={s.playerBox}>
      <Text style={{fontSize:36,marginBottom:8}}>📡</Text>
      <Text style={{color:C.muted,fontSize:13}}>Pilih server</Text>
    </View>
  );

  const isIframe = url.trim().toLowerCase().startsWith('<iframe');

  // Ekstrak src dari iframe jika ada
  const getSrc = (raw) => {
    const match = raw.match(/src=["']([^"']+)["']/i);
    return match ? match[1] : raw;
  };
  const openUrl = isIframe ? getSrc(url) : url;

  // Tampilkan WebView + tombol buka browser sebagai fallback
  return (
    <View style={{gap:8}}>
      <View style={s.playerBox}>
        <WebView
          source={{uri: openUrl}}
          style={{flex:1,backgroundColor:'#000'}}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
          injectedJavaScript={'document.referrer;'}
          onHttpError={(e)=>console.log('HTTP Error:',e.nativeEvent)}
        />
      </View>
      <TouchableOpacity
        style={{backgroundColor:C.surface,borderWidth:1,borderColor:C.border,borderRadius:8,paddingVertical:10,alignItems:'center'}}
        onPress={()=>Linking.openURL(openUrl)}>
        <Text style={{color:C.green,fontWeight:'700',fontSize:13}}>🌐 Buka di Browser (jika player hitam)</Text>
      </TouchableOpacity>
    </View>
  );

  // (kode lama tidak terpakai)
  if (false) {

  } // end if(false)
}

// ══════════════════════════════════════════════════════════════
// SCREEN: HOME
// ══════════════════════════════════════════════════════════════
function HomeScreen({ onMatchPress }) {
  const [matches,setMatches] = useState([]);
  const [leagues,setLeagues] = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRef]  = useState(false);
  const [liga,setLiga]       = useState('all');
  const [search,setSearch]   = useState('');

  const load = useCallback(async (isRef=false) => {
    try {
      if (!isRef) setLoading(true);
      const [mr,lr] = await Promise.all([
        fetch(`${API}/matches?status=all&limit=150`),
        fetch(`${API}/leagues`),
      ]);
      const md=await mr.json(); const ld=await lr.json();
      if (md.success) setMatches(md.data);
      if (ld.success) setLeagues(ld.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); setRef(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = matches.filter(m => {
    if (getMatchState(m) === 'ended') return false; // sembunyikan match selesai
    const lgOk = liga==='all' || m.league_slug===liga;
    const srOk = !search || [m.home_team,m.away_team,m.league].join(' ').toLowerCase().includes(search.toLowerCase());
    return lgOk && srOk;
  });

  // Group by tanggal
  const grouped = filtered.reduce((acc,m) => {
    const k = m.match_date||'TBD';
    if (!acc[k]) acc[k]=[];
    acc[k].push(m); return acc;
  }, {});
  const sections = Object.keys(grouped).sort().map(dk => ({title:fmtDate(dk)||dk, data:grouped[dk]}));

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={C.green} size="large"/>
      <Text style={[s.muted,{marginTop:12}]}>Memuat jadwal...</Text>
    </View>
  );

  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{backgroundColor:C.surface,borderBottomWidth:1,borderBottomColor:C.border}}
        contentContainerStyle={{paddingHorizontal:14,paddingVertical:8,gap:8}}>
        {[{slug:'all',name:'🌍 Semua'},...leagues].map(lg => (
          <TouchableOpacity key={lg.slug} style={[s.lgBtn,liga===lg.slug&&s.lgBtnOn]} onPress={()=>setLiga(lg.slug)}>
            <Text style={[s.lgTxt,liga===lg.slug&&{color:C.green}]}>{lg.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.srchWrap}>
        <Text style={{fontSize:14,marginRight:8}}>🔍</Text>
        <TextInput style={s.srchIn} placeholder="Cari tim atau liga..." placeholderTextColor={C.muted}
          value={search} onChangeText={setSearch}/>
        {search ? <TouchableOpacity onPress={()=>setSearch('')}><Text style={{color:C.muted,fontSize:16}}>✕</Text></TouchableOpacity> : null}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRef(true);load(true);}} tintColor={C.green}/>}
        contentContainerStyle={{padding:14,paddingBottom:90}}>
        {sections.length===0 && <View style={s.empty}><Text style={{fontSize:40}}>📅</Text><Text style={s.muted}>Tidak ada pertandingan</Text></View>}
        {sections.map(sec => (
          <View key={sec.title}>
            <View style={s.dateSep}>
              <View style={{width:3,height:16,backgroundColor:C.green,borderRadius:2,marginRight:8}}/>
              <Text style={{color:C.text,fontWeight:'800',fontSize:13,letterSpacing:0.5}}>{sec.title}</Text>
              <View style={{flex:1,height:1,backgroundColor:C.border,marginLeft:10}}/>
            </View>
            {sec.data.map(m => <View key={m.id} style={{marginBottom:10}}><MatchCard match={m} onPress={onMatchPress}/></View>)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// SCREEN: DETAIL MATCH
// ══════════════════════════════════════════════════════════════
function MatchDetailScreen({ match, onBack }) {
  const [detail,setDetail] = useState(null);
  const [loading,setLoading] = useState(true);
  const [srv,setSrv] = useState(0);

  useEffect(() => {
    fetch(`${API}/matches/${match.id}`).then(r=>r.json()).then(d=>{if(d.success)setDetail(d.data);}).finally(()=>setLoading(false));
  }, []);

  const data = detail||match;
  const streams = data.streams||[];
  const isUrl = u => u && u.startsWith('http');

  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={onBack} style={{padding:6,marginRight:8}}>
          <Text style={{color:C.green,fontSize:24,fontWeight:'900'}}>‹</Text>
        </TouchableOpacity>
        <Text style={{color:C.text,fontWeight:'800',fontSize:14,flex:1}} numberOfLines={1}>{data.home_team} vs {data.away_team}</Text>
        <MatchBadge match={data}/>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom:90}}>
        {/* Score bar */}
        <View style={{backgroundColor:C.surface,padding:16,borderBottomWidth:1,borderBottomColor:C.border}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <View style={{flex:1,alignItems:'center',gap:8}}>
              <View style={{width:56,height:56,borderRadius:28,backgroundColor:C.card,borderWidth:2,borderColor:C.border,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                {isUrl(data.home_logo)?<Image source={{uri:data.home_logo}} style={{width:'100%',height:'100%'}}/>:<Text style={{fontSize:26}}>{data.home_logo||'🏠'}</Text>}
              </View>
              <Text style={{color:C.text,fontWeight:'800',fontSize:14,textAlign:'center',maxWidth:100}} numberOfLines={2}>{data.home_team}</Text>
            </View>
            <View style={{alignItems:'center',paddingHorizontal:12}}>
              <Text style={{fontSize:30,fontWeight:'900',color:'#7a8aaa',letterSpacing:4}}>VS</Text>
              <Text style={{color:C.muted,fontSize:11,marginTop:4}}>{data.kickoff} WIB</Text>
            </View>
            <View style={{flex:1,alignItems:'center',gap:8}}>
              <View style={{width:56,height:56,borderRadius:28,backgroundColor:C.card,borderWidth:2,borderColor:C.border,alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                {isUrl(data.away_logo)?<Image source={{uri:data.away_logo}} style={{width:'100%',height:'100%'}}/>:<Text style={{fontSize:26}}>{data.away_logo||'✈️'}</Text>}
              </View>
              <Text style={{color:C.text,fontWeight:'800',fontSize:14,textAlign:'center',maxWidth:100}} numberOfLines={2}>{data.away_team||'TBD'}</Text>
            </View>
          </View>
          <View style={{flexDirection:'row',justifyContent:'center',gap:12,marginTop:12,flexWrap:'wrap'}}>
            <Text style={{color:C.muted,fontSize:12}}>🏆 {data.league}</Text>
            <Text style={{color:C.muted,fontSize:12}}>📅 {fmtDate(data.match_date)}</Text>
            {data.stadium?<Text style={{color:C.muted,fontSize:12}}>🏟 {data.stadium}</Text>:null}
          </View>
        </View>

        {loading ? <ActivityIndicator color={C.green} style={{margin:24}}/> : (
          <View style={{margin:14}}>
            {streams.length > 0 ? (
              <>
                <Text style={s.secTitle}>📡 Server Streaming</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}} contentContainerStyle={{gap:8}}>
                  {streams.map((url,i) => (
                    <TouchableOpacity key={i} style={[s.srvBtn,srv===i&&s.srvBtnOn]} onPress={()=>setSrv(i)}>
                      <Text style={[{fontSize:12,fontWeight:'700'},srv===i?{color:'#000'}:{color:C.text}]}>Server {i+1}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <StreamPlayer url={streams[srv]}/>
              </>
            ) : (
              <View style={{alignItems:'center',padding:30,backgroundColor:C.card,borderRadius:12,borderWidth:1,borderColor:C.border}}>
                <Text style={{fontSize:32}}>📡</Text>
                <Text style={[s.muted,{marginTop:8}]}>Stream belum tersedia</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// SCREEN: FILM LIST
// ══════════════════════════════════════════════════════════════
function FilmListScreen({ genreSlug, typeFilter, label, onFilmPress }) {
  const [films,setFilms]     = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRef]  = useState(false);
  const [page,setPage]       = useState(1);
  const [hasMore,setHasMore] = useState(true);
  const [search,setSearch]   = useState('');
  const [searchIn,setIn]     = useState('');

  const load = useCallback(async (pg=1, srch='', isRef=false) => {
    try {
      if (pg===1&&!isRef) setLoading(true);
      let url = `${API}/films?limit=21&page=${pg}`;
      if (genreSlug) url += `&genre=${genreSlug}`;
      if (typeFilter&&typeFilter!=='all') url += `&type=${typeFilter}`;
      if (srch) url += `&search=${encodeURIComponent(srch)}`;
      const res=await fetch(url); const d=await res.json();
      if (d.success) {
        setFilms(pg===1 ? d.data : prev=>[...prev,...d.data]);
        setHasMore(pg < d.pages); setPage(pg);
      }
    } catch(e){console.error(e);}
    finally {setLoading(false);setRef(false);}
  }, [genreSlug,typeFilter]);

  useEffect(()=>{load(1,search);},[search]);

  if (loading&&films.length===0) return <View style={s.center}><ActivityIndicator color={C.green} size="large"/></View>;

  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.srchWrap}>
        <Text style={{fontSize:14,marginRight:8}}>🔍</Text>
        <TextInput style={s.srchIn} placeholder={`Cari ${label||'film'}...`} placeholderTextColor={C.muted}
          value={searchIn} onChangeText={setIn} onSubmitEditing={()=>setSearch(searchIn)} returnKeyType="search"/>
        {searchIn?<TouchableOpacity onPress={()=>{setIn('');setSearch('');}}><Text style={{color:C.muted,fontSize:16}}>✕</Text></TouchableOpacity>:null}
      </View>
      <FlatList data={films} keyExtractor={item=>String(item.id)} numColumns={3}
        renderItem={({item})=><FilmCard film={item} onPress={onFilmPress}/>}
        contentContainerStyle={{padding:10,paddingBottom:90}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRef(true);load(1,search,true);}} tintColor={C.green}/>}
        onEndReached={()=>{if(hasMore&&!loading)load(page+1,search);}} onEndReachedThreshold={0.4}
        ListFooterComponent={hasMore?<ActivityIndicator color={C.green} style={{margin:16}}/>:null}
        ListEmptyComponent={<View style={s.empty}><Text style={{fontSize:40}}>🎬</Text><Text style={s.muted}>Tidak ada film</Text></View>}/>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// SCREEN: DETAIL FILM
// ══════════════════════════════════════════════════════════════
function FilmDetailScreen({ film, onBack }) {
  const [detail,setDetail] = useState(null);
  const [loading,setLoading] = useState(true);
  const [season,setSeason] = useState(null);
  const [epIdx,setEpIdx]   = useState(0);
  const [srv,setSrv]       = useState(0);

  useEffect(()=>{
    fetch(`${API}/films/${film.id}`).then(r=>r.json()).then(d=>{
      if (d.success) {
        setDetail(d.data);
        const sns=Object.keys(d.data.episodes||{});
        if(sns.length) setSeason(sns[0]);
      }
    }).finally(()=>setLoading(false));
  },[]);

  const data = detail||film;
  const isTv = data.type==='tv';
  const seasons = detail ? Object.keys(detail.episodes||{}) : [];
  const eps = (season&&detail?.episodes?.[season])||[];
  const ep  = eps[epIdx]||null;
  const streams = isTv ? (ep?.streams||[]) : (detail?.streams||[]);

  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={onBack} style={{padding:6,marginRight:8}}>
          <Text style={{color:C.green,fontSize:24,fontWeight:'900'}}>‹</Text>
        </TouchableOpacity>
        <Text style={{color:C.text,fontWeight:'800',fontSize:14,flex:1}} numberOfLines={1}>{data.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom:90}}>
        {/* Backdrop + info */}
        <View style={{height:200,backgroundColor:C.surface,position:'relative',overflow:'hidden'}}>
          {data.backdrop_url?<Image source={{uri:data.backdrop_url}} style={{width:'100%',height:'100%',opacity:0.35}} resizeMode="cover"/>:null}
          <View style={{position:'absolute',bottom:0,left:0,right:0,padding:14,flexDirection:'row',gap:12,alignItems:'flex-end',backgroundColor:'rgba(8,10,15,0.6)'}}>
            {data.poster_url?<Image source={{uri:data.poster_url}} style={{width:80,height:118,borderRadius:8,flexShrink:0}} resizeMode="cover"/>:null}
            <View style={{flex:1}}>
              <Text style={{color:C.text,fontWeight:'900',fontSize:17,lineHeight:22,marginBottom:4}} numberOfLines={3}>{data.title}</Text>
              {data.year?<Text style={{color:C.muted,fontSize:12}}>{data.year} · {isTv?'Series':'Film'} · {data.quality}</Text>:null}
              {data.rating?<Text style={{color:C.gold,fontSize:13,marginTop:4}}>⭐ {parseFloat(data.rating).toFixed(1)}/10</Text>:null}
            </View>
          </View>
        </View>

        {/* Genre */}
        {data.genres?.length>0&&(
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{paddingHorizontal:14,marginTop:10}} contentContainerStyle={{gap:8}}>
            {data.genres.map(g=>(
              <View key={g.id} style={{backgroundColor:C.greenDim,borderRadius:20,borderWidth:1,borderColor:'rgba(0,240,112,0.4)',paddingHorizontal:12,paddingVertical:5}}>
                <Text style={{color:C.green,fontSize:12,fontWeight:'700'}}>{g.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {loading ? <ActivityIndicator color={C.green} style={{margin:24}}/> : (
          <>
            {/* Episode (TV) */}
            {isTv&&seasons.length>0&&(
              <View style={{margin:14}}>
                <Text style={s.secTitle}>📺 Episode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}} contentContainerStyle={{gap:8}}>
                  {seasons.map(sn=>(
                    <TouchableOpacity key={sn} style={[s.srvBtn,season===sn&&s.srvBtnOn]} onPress={()=>{setSeason(sn);setEpIdx(0);setSrv(0);}}>
                      <Text style={[{fontSize:12,fontWeight:'700'},season===sn?{color:'#000'}:{color:C.text}]}>Season {sn}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                  {eps.map((ep2,i)=>(
                    <TouchableOpacity key={i} style={[s.epBtn,epIdx===i&&s.epBtnOn,!ep2.has_stream&&{borderColor:C.border}]} onPress={()=>{setEpIdx(i);setSrv(0);}}>
                      <Text style={[{fontSize:11,fontWeight:'700'},epIdx===i?{color:'#000'}:{color:ep2.has_stream?C.green:C.muted}]}>Ep {ep2.number||(i+1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {ep&&<Text style={{color:C.muted,fontSize:12,marginTop:8}}>▶ S{season} Ep{ep.number} — {ep.title}</Text>}
              </View>
            )}

            {/* Player */}
            <View style={{margin:14,marginTop:isTv?0:14}}>
              {streams.length>0?(
                <>
                  <Text style={s.secTitle}>▶ Tonton Sekarang</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}} contentContainerStyle={{gap:8}}>
                    {streams.map((st,i)=>(
                      <TouchableOpacity key={i} style={[s.srvBtn,srv===i&&s.srvBtnOn]} onPress={()=>setSrv(i)}>
                        <Text style={[{fontSize:12,fontWeight:'700'},srv===i?{color:'#000'}:{color:C.text}]}>{st.label||`Server ${i+1}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <StreamPlayer url={streams[srv]?.url}/>
                </>
              ):(
                <View style={{alignItems:'center',padding:30,backgroundColor:C.card,borderRadius:12,borderWidth:1,borderColor:C.border}}>
                  <Text style={{fontSize:32}}>🎬</Text>
                  <Text style={[s.muted,{marginTop:8}]}>Stream belum tersedia</Text>
                </View>
              )}
            </View>

            {/* Sinopsis */}
            {data.overview&&(
              <View style={[s.infoBox,{margin:14,marginTop:0}]}>
                <Text style={s.infoBoxTtl}>📝 SINOPSIS</Text>
                <Text style={{color:'#c0c8d8',fontSize:13,lineHeight:20}}>{data.overview}</Text>
              </View>
            )}

            {/* Info */}
            <View style={[s.infoBox,{margin:14,marginTop:0}]}>
              <Text style={s.infoBoxTtl}>ℹ️ INFORMASI</Text>
              {[
                data.directors?.length&&['🎬 Sutradara',data.directors.join(', ')],
                data.runtime&&['⏱ Durasi',`${data.runtime} menit`],
                data.language&&['🌐 Bahasa',data.language],
                data.country?.length&&['🏳️ Negara',Array.isArray(data.country)?data.country.join(', '):data.country],
                isTv&&data.seasons&&['📺 Season',String(data.seasons)],
                isTv&&data.episodes_count&&['🎬 Total Ep',String(data.episodes_count)],
              ].filter(Boolean).map(([k,v])=>(
                <View key={k} style={s.infoRow}>
                  <Text style={s.infoK}>{k}</Text>
                  <Text style={s.infoV} numberOfLines={2}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Cast */}
            {data.cast?.length>0&&(
              <View style={{marginHorizontal:14,marginBottom:14}}>
                <Text style={s.secTitle}>🎭 Pemeran</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>
                  {data.cast.map((c,i)=>(
                    <View key={i} style={{alignItems:'center',width:64}}>
                      <View style={{width:54,height:54,borderRadius:27,backgroundColor:C.surface,borderWidth:2,borderColor:C.border,overflow:'hidden',marginBottom:5,alignItems:'center',justifyContent:'center'}}>
                        {c.photo?<Image source={{uri:c.photo}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>:<Text style={{fontSize:20}}>👤</Text>}
                      </View>
                      <Text style={{color:C.blue,fontSize:10,fontWeight:'700',textAlign:'center',lineHeight:13}} numberOfLines={2}>{c.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════════════════════
const TABS=[{key:'home',label:'Home',icon:'⚽'},{key:'film',label:'Film',icon:'🎬'},{key:'series',label:'Series',icon:'📺'},{key:'lokal',label:'Lokal 18+',icon:'🔞'},{key:'javhd',label:'JAVHD',icon:'▶'}];

function BottomNav({ active, onChange }) {
  return (
    <View style={s.nav}>
      {TABS.map(t=>{
        const on=active===t.key;
        return (
          <TouchableOpacity key={t.key} style={s.navItem} onPress={()=>onChange(t.key)}>
            <Text style={[{fontSize:20},on&&{transform:[{scale:1.15}]}]}>{t.icon}</Text>
            <Text style={[s.navLbl,on&&{color:C.orange,fontWeight:'800'}]}>{t.label}</Text>
            {on&&<View style={s.navDot}/>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════
const TAB_CFG = {
  home:  {title:'⚽ DF21 LIVE',  Comp:HomeScreen,     props:{}},
  film:  {title:'🎬 Film',       Comp:FilmListScreen, props:{typeFilter:'movie'}},
  series:{title:'📺 Series',     Comp:FilmListScreen, props:{typeFilter:'tv'}},
  lokal: {title:'🔞 Lokal 18+',  Comp:FilmListScreen, props:{genreSlug:'18'}},
  javhd: {title:'🎌 JAVHD',      Comp:FilmListScreen, props:{genreSlug:'18-jav'}},
};

export default function App() {
  const [tab,setTab]         = useState('home');
  const [matchDetail,setMatch] = useState(null);
  const [filmDetail,setFilm]   = useState(null);

  if (matchDetail) return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <MatchDetailScreen match={matchDetail} onBack={()=>setMatch(null)}/>
    </SafeAreaView>
  );

  if (filmDetail) return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <FilmDetailScreen film={filmDetail} onBack={()=>setFilm(null)}/>
    </SafeAreaView>
  );

  const {title, Comp, props} = TAB_CFG[tab];
  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <View style={s.hdr}>
        <View style={{width:28,height:28,backgroundColor:C.green,borderRadius:14,alignItems:'center',justifyContent:'center',marginRight:8}}>
          <Text style={{fontSize:14}}>⚽</Text>
        </View>
        <Text style={s.logo}>{title}</Text>
      </View>
      <View style={{flex:1}}>
        <Comp {...props} onMatchPress={setMatch} onFilmPress={setFilm} label={props.genreSlug||props.typeFilter}/>
      </View>
      <BottomNav active={tab} onChange={setTab}/>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  center:   {flex:1,alignItems:'center',justifyContent:'center',backgroundColor:C.bg},
  empty:    {alignItems:'center',justifyContent:'center',padding:40,marginTop:40},
  muted:    {color:C.muted,fontSize:13},
  hdr:      {height:54,backgroundColor:C.surface,borderBottomWidth:1,borderBottomColor:C.border,flexDirection:'row',alignItems:'center',paddingHorizontal:16},
  logo:     {fontSize:20,fontWeight:'900',color:C.green,letterSpacing:1.5},
  lgBtn:    {paddingVertical:7,paddingHorizontal:14,borderRadius:20,borderWidth:1,borderColor:C.border,backgroundColor:C.card},
  lgBtnOn:  {borderColor:C.green,backgroundColor:C.greenDim},
  lgTxt:    {color:C.muted,fontSize:12,fontWeight:'600'},
  srchWrap: {flexDirection:'row',alignItems:'center',margin:12,backgroundColor:C.card,borderRadius:10,borderWidth:1,borderColor:C.border,paddingHorizontal:12},
  srchIn:   {flex:1,color:C.text,fontSize:13,paddingVertical:10},
  dateSep:  {flexDirection:'row',alignItems:'center',marginBottom:10,marginTop:6},
  mc:       {backgroundColor:C.card,borderRadius:14,borderWidth:1,borderColor:C.border,overflow:'hidden'},
  mcTop:    {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:9,backgroundColor:'rgba(255,255,255,0.025)',borderBottomWidth:1,borderBottomColor:C.border},
  mcLg:     {fontSize:12,color:C.muted,flex:1,marginRight:8},
  badge:    {flexDirection:'row',alignItems:'center',borderRadius:20,borderWidth:1,paddingHorizontal:8,paddingVertical:3},
  badgeTxt: {fontWeight:'700',letterSpacing:0.5,fontSize:10},
  dot:      {width:6,height:6,borderRadius:3,backgroundColor:C.red,marginRight:5},
  mcBody:   {flexDirection:'row',alignItems:'center',padding:14,gap:8},
  mcTeam:   {flex:1,alignItems:'center'},
  mcLogo:   {width:46,height:46,borderRadius:23,backgroundColor:C.surface,borderWidth:2,borderColor:C.border,alignItems:'center',justifyContent:'center',marginBottom:7,overflow:'hidden'},
  mcLogoImg:{width:'100%',height:'100%'},
  mcName:   {fontSize:12,fontWeight:'700',textAlign:'center',color:C.text,lineHeight:16},
  mcMid:    {alignItems:'center',width:72},
  mcVs:     {fontSize:22,fontWeight:'900',color:'#7a8aaa',letterSpacing:2},
  mcTime:   {fontSize:10,color:C.muted,marginTop:4,textAlign:'center'},
  mcBot:    {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:9,borderTopWidth:1,borderTopColor:C.border},
  mcDateTxt:{fontSize:11,color:C.muted,flex:1},
  playerBox:{backgroundColor:'#000',borderRadius:12,height:210,overflow:'hidden',alignItems:'center',justifyContent:'center'},
  srvBtn:   {paddingVertical:8,paddingHorizontal:16,borderRadius:8,borderWidth:1,borderColor:C.border,backgroundColor:C.card},
  srvBtnOn: {backgroundColor:C.green,borderColor:C.green},
  epBtn:    {paddingVertical:6,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:'rgba(0,240,112,0.4)',backgroundColor:C.card,marginBottom:4},
  epBtnOn:  {backgroundColor:C.green,borderColor:C.green},
  infoBox:  {backgroundColor:C.card,borderRadius:12,borderWidth:1,borderColor:C.border,padding:14},
  infoBoxTtl:{color:C.muted,fontSize:11,fontWeight:'700',marginBottom:10,letterSpacing:0.8},
  infoRow:  {flexDirection:'row',justifyContent:'space-between',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.04)'},
  infoK:    {color:C.muted,fontSize:12,flex:1},
  infoV:    {color:C.text,fontSize:12,fontWeight:'600',flex:2,textAlign:'right'},
  secTitle: {fontSize:14,fontWeight:'800',color:C.green,marginBottom:10,letterSpacing:0.5},
  nav:      {flexDirection:'row',backgroundColor:'rgba(13,17,23,0.97)',borderTopWidth:1,borderTopColor:'rgba(255,159,10,0.2)',paddingBottom:Platform.OS==='ios'?20:8,paddingTop:8},
  navItem:  {flex:1,alignItems:'center',justifyContent:'center',gap:3,position:'relative'},
  navLbl:   {fontSize:10,color:C.muted,fontWeight:'500'},
  navDot:   {position:'absolute',bottom:-4,width:4,height:4,borderRadius:2,backgroundColor:C.orange},
});

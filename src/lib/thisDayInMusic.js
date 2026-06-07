import { normalizeRegion } from '@/lib/chartsUtils';

const THIS_DAY_FACTS = {
  global: [
    { year: 2009, text: '"Boom Boom Pow" by The Black Eyed Peas hit #1 globally.' },
    { year: 1987, text: 'Whitney Houston became the first woman with seven consecutive US #1 singles.' },
    { year: 2016, text: 'Streaming overtook digital downloads as the primary format worldwide.' },
  ],
  us: [
    { year: 1995, text: 'Mariah Carey and Boyz II Men dominated US radio with "One Sweet Day".' },
    { year: 2010, text: 'Lady Gaga crossed one billion views on YouTube milestones in the US market.' },
    { year: 2021, text: 'Olivia Rodrigo held #1 as a breakout streaming era artist in the US.' },
  ],
  uk: [
    { year: 1997, text: 'The UK chart saw Britpop and dance collide in a historic summer run.' },
    { year: 2014, text: 'Ed Sheeran became one of the most streamed UK artists of the decade.' },
    { year: 2024, text: 'Charli XCX pushed UK pop into a bold club-focused era.' },
  ],
  japan: [
    { year: 1999, text: 'Utada Hikaru set a new benchmark for modern J-Pop records.' },
    { year: 2018, text: 'Kenshi Yonezu topped multiple domestic digital charts simultaneously.' },
    { year: 2023, text: 'YOASOBI became the first Japanese act to top major global streaming charts.' },
  ],
  india: [
    { year: 2003, text: 'A. R. Rahman soundtracks drove a new era of global Indian film music.' },
    { year: 2019, text: 'Arijit Singh became one of the most streamed artists in India.' },
    { year: 2024, text: 'Diljit Dosanjh expanded Punjabi pop into global arena stages.' },
  ],
};

export const getThisDayInMusic = ({ region = 'global', date = new Date() } = {}) => {
  const normalizedRegion = normalizeRegion(region);
  const facts = THIS_DAY_FACTS[normalizedRegion] || THIS_DAY_FACTS.global;
  const daySeed =
    date.getUTCFullYear() * 372 +
    (date.getUTCMonth() + 1) * 31 +
    date.getUTCDate();
  const fact = facts[daySeed % facts.length];
  return {
    title: 'THIS DAY IN MUSIC',
    dateLabel: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date),
    year: fact.year,
    text: fact.text,
  };
};

export default getThisDayInMusic;

-- Seed matched Reddit posts resolved via school slugs

DELETE FROM reddit_posts WHERE id IN ('reddit_1uxok4c', 'reddit_1uxiyes', 'reddit_1uxasu6', 'reddit_1uwpi3t', 'reddit_1uwl1z5', 'reddit_1uw167l', 'reddit_1uvf5gk', 'reddit_1uv7ele', 'reddit_1ut9f66', 'reddit_1ut22vq', 'reddit_1unbubb', 'reddit_1tp524m', 'reddit_1tehbv4', 'reddit_1tbseoj', 'reddit_1t3gxvy', 'reddit_1t0hl2u', 'reddit_1rnayrr', 'reddit_1re9m0o', 'reddit_1qjs9p2', 'reddit_1pp5ic5', 'reddit_1pllutw', 'reddit_1uw4s1m', 'reddit_1uvm2yh', 'reddit_1usr8ij', 'reddit_1uso1wt', 'reddit_1ursu67', 'reddit_1ur5ghs', 'reddit_1uqw9eh', 'reddit_1uqibun', 'reddit_1uqgark');

INSERT INTO reddit_posts (id, school_id, subreddit, title, body, author, created_at, sentiment_score, themes) VALUES
('reddit_1uxok4c', (SELECT id FROM schools WHERE slug = 'ais-bucharest-bucharest-romania' LIMIT 1), $$r/Internationalteachers$$, $$International School in Bucharest$$, $$Hi all! I’m looking to teach abroad starting in the 2027-28 school year, and I’m thinking about Bucharest! I know there are several international schools, and I’d like to know more about the hiring process, timeline of getting hired, packages offered, work life balance, etc. How many openings are there typically for each school year? How competitive is the hiring process? I currently have 2 years of teaching experience in the US, I have my masters in elementary ed, and I am also fluent in Romanian/a Romanian citizen. I would love to live/teach in RO because I grew up spending my summers with m$$, $$tables321$$, '2026-07-16T00:00:00.000Z', 0.5, ARRAY['Salary', 'Housing', 'Workload', 'Parents']::text[]),
('reddit_1uxiyes', (SELECT id FROM schools WHERE slug = 'tashkent-international-school-tashkent-uzbekistan' LIMIT 1), $$r/Internationalteachers$$, $$Maple Bear Canadian School Tashkent, Uzbekistan$$, $$*Hi everyone. I’m a teacher considering an offer from Maple Bear Tashkent (Uzbekistan). Can any former or current teachers from this campus—or anyone currently teaching in Tashkent, give me their honest thoughts on the working conditions there? Thank you!*$$, $$Commercial-Point2713$$, '2026-07-15T00:00:00.000Z', 0, ARRAY['Housing', 'Facilities']::text[]),
('reddit_1uxasu6', (SELECT id FROM schools WHERE slug = 'dubai-international-academy-dubai-united-arab-emirates' LIMIT 1), $$r/Internationalteachers$$, $$Accepting a job offer after turning it down$$, $$Hello,

Two years ago, I turned down an offer to teach in international school in Dubai. I had unexpected family commitments back to that time. 

Nowadays, I found the hiring manager and principal, still advertising for the same role and position it still open.

What are chances to re-apply back? And should I apply through their platform or recall the past experience and contact them directly through email?

Thanks in advance$$, $$No_Yard_8900$$, '2026-07-15T00:00:00.000Z', 0, ARRAY['Leadership', 'Communication']::text[]),
('reddit_1uwpi3t', (SELECT id FROM schools WHERE slug = 'dubai-international-academy-dubai-united-arab-emirates' LIMIT 1), $$r/Internationalteachers$$, $$Dubai?$$, $$For those of you in the UK or with access to the BBC iPlayer. There is an interesting Panorama program available discussing whether the end is nigh for Dubai. Lots of interviews with airheads/influencers talking about booze and nightlife but the underlying these seems to be the mass exodus of ex pats because of Trumpys war and whether they will come back. I guess this could affect schools?$$, $$ripples1602$$, '2026-07-14T00:00:00.000Z', 0, ARRAY['Whether', 'Those', 'Access']::text[]),
('reddit_1uwl1z5', (SELECT id FROM schools WHERE slug = 'dubai-international-academy-dubai-united-arab-emirates' LIMIT 1), $$r/Internationalteachers$$, $$iPGCE attestation for UAE$$, $$I want to attest my ipgce for use in Dubai

Can anyone guide me on the process? I'm Egyptian, and currently in Egypt as well. I hold iPGCE from Liverpool John Moores University and I got a job offer in Dubai but they want the teaching certificate to be attested.

What can I do? Thanks$$, $$No_Yard_8900$$, '2026-07-14T00:00:00.000Z', 0, ARRAY['Housing']::text[]),
('reddit_1uw167l', (SELECT id FROM schools WHERE slug = 'international-school-of-luxembourg-luxembourg-city-luxembourg' LIMIT 1), $$r/Internationalteachers$$, $$St George’s international school, Luxembourg$$, $$Hi,  
I was wondering if anyone had any insights about working at this school particularly primary and also as a staff parent.  
Many thanks in advance$$, $$RelativeStranger8935$$, '2026-07-14T00:00:00.000Z', 0, ARRAY['Housing', 'Parents']::text[]),
('reddit_1uvf5gk', (SELECT id FROM schools WHERE slug = 'dubai-international-academy-dubai-united-arab-emirates' LIMIT 1), $$r/Internationalteachers$$, $$Teacher Salary in Dubai$$, $$Hi everyone! I'm asking on behalf of a friend.

Does anyone currently work, or has anyone recently worked, as a \*\*Learning Support Assistant (LSA)\*\* at GEMS Dubai School?

We're trying to get an idea of the current salary range and benefits. How much is the monthly salary, and what benefits are included (housing, airfare, medical insurance, etc.)?$$, $$Responsible-Book4439$$, '2026-07-13T00:00:00.000Z', 0, ARRAY['Salary', 'Housing']::text[]),
('reddit_1uv7ele', (SELECT id FROM schools WHERE slug = 'guis-guangzhou-china' LIMIT 1), $$r/Internationalteachers$$, $$GUIS international school, Guangzhou$$, $$Any recent feedback? Work-life balance, community, students, management etc.$$, $$Eminemsmailly$$, '2026-07-13T00:00:00.000Z', 0, ARRAY['Leadership', 'Workload', 'Students', 'Parents']::text[]),
('reddit_1ut9f66', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/Internationalteachers$$, $$Apostille for Thailand$$, $$Hi all,

My new school in September (Thailand) asked me to apostille my Acro Police Check (just in case). I've worked in Thailand before and didn't need to do that. I was wondering if this was a new requirement? It's an extra expense before I go, and I want to avoid it if it's unnecessary.

Thanks for any insight!$$, $$Important-Disaster34$$, '2026-07-11T00:00:00.000Z', -0.5, ARRAY['Thailand', 'Before', 'September']::text[]),
('reddit_1ut22vq', (SELECT id FROM schools WHERE slug = 'new-school-international-school-of-georgia-tbilisi-georgia' LIMIT 1), $$r/Internationalteachers$$, $$Does the university of the subject masters matter?$$, $$I have two options. One is an online school that can be done in a year but is viewed weakly - Western Governors University. The other school is Georgia Tech and would be \~3 years to finish.  

  

**Would hiring managers and senior leadership care if my Masters is from WGU vs Georgia Tech?**$$, $$Procrastinaught$$, '2026-07-10T00:00:00.000Z', 0, ARRAY['Leadership']::text[]),
('reddit_1unbubb', (SELECT id FROM schools WHERE slug = 'new-school-international-school-of-georgia-tbilisi-georgia' LIMIT 1), $$r/Internationalschools$$, $$Avoid the Newton Free School in Tbilisi, Georgia$$, $$The school will violate its contract and then harass you for complaining about the contract conditions not being met and threaten to terminate you. The environment is highly toxic and allows students to assault, stalk, and injure teachers, and refuses to discipline students. Teachers have been hospitalized because of injuries and the school refuses to cover the medical bills and will blame the teacher for being injured. If any complaints are filed, the school punishes teachers with extra work and then harasses the teachers into silence and force the teacher to remove the complaint. The school $$, $$Mostly-Teacher-6177$$, '2026-07-04T00:00:00.000Z', -0.6666666666666666, ARRAY['Salary', 'Leadership', 'Workload', 'Students', 'Culture', 'Turnover']::text[]),
('reddit_1tp524m', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/Internationalschools$$, $$International schooling in Asia$$, $$Hi, I'm currently living outside of Asia (I'm 13f) where I've lived since I was born however one of my grandparents is korean and I'd love to be able to go to an international boarding school there, idealy South Korea or Japan but wherever is possible really - Thailand probably being most plausible. I'd need a scholarship covering as much as possible of tuition to be able to go this would probably have to be in academic or dance if hat's a thing you can get a scholarship in as those are my strongest points. If you have any ideas of schools I could look into it would be very appreciated. 

Than$$, $$Narrow_Ad1449$$, '2026-05-27T00:00:00.000Z', 0.6666666666666666, ARRAY['Housing', 'Parents']::text[]),
('reddit_1tehbv4', (SELECT id FROM schools WHERE slug = 'international-school-of-singapore-singapore-singapore' LIMIT 1), $$r/Internationalschools$$, $$SINGAPORE INTERNATIONAL SCHOOL VIETNAM$$, $$End Of Year Concert shouldnt be a thing fuck this guy ricky tan

There was a teacher who got caught being a pedo and used fake name this school is the most corrupted school ever do not become a kinderworld supporter.

FUCKING KINGDERWORLD$$, $$Inevitable-Hawk-7283$$, '2026-05-16T00:00:00.000Z', 0, ARRAY['Concert', 'Shouldnt', 'Thing']::text[]),
('reddit_1tbseoj', (SELECT id FROM schools WHERE slug = 'singapore-american-school-singapore-singapore' LIMIT 1), $$r/Internationalschools$$, $$International Schools in Danang Hoi An Vietnam (Parents perspective)$$, $$We’ve been in Da Nang for a while now and have done quite a bit of research on schools, so here are a few you might want to look into. These are just based on our personal impressions and what we found during our search:

**St. Nicholas International School**  
**Good:** American curriculum, and they just moved to a really nice new campus last year. It seems quite popular with local families.  
**Not so good:** Personally, we’re not sure it really feels like a true international school since a lot of the learning seems to be delivered online through a purchased curriculum.

**Singapore Interna$$, $$EconomyRope756$$, '2026-05-13T00:00:00.000Z', -0.375, ARRAY['Housing', 'Leadership', 'Students', 'Parents', 'Facilities', 'Communication']::text[]),
('reddit_1t3gxvy', (SELECT id FROM schools WHERE slug = 'hong-kong-international-school-hong-kong-hong-kong' LIMIT 1), $$r/Internationalschools$$, $$Whats the best international school by ranking?$$, $$Moving to hong kong and there’s no official ranking. Theres lots of marketing from these school to drive applications. Our aim is to eventually move to uk for high school. Which international school is most elite?$$, $$tctc302$$, '2026-05-04T00:00:00.000Z', 0, ARRAY['Moving', 'Official', 'Ranking']::text[]),
('reddit_1t0hl2u', (SELECT id FROM schools WHERE slug = 'hong-kong-international-school-hong-kong-hong-kong' LIMIT 1), $$r/Internationalschools$$, $$What are the best international schools for rich families in Hong Kong? Has anyone got a rejection letter and reversed the outcome?$$, $$Moving to Hong Kong and need help with schools.$$, $$tctc302$$, '2026-05-01T00:00:00.000Z', 0, ARRAY['Moving', 'Schools']::text[]),
('reddit_1rnayrr', (SELECT id FROM schools WHERE slug = 'academia-cotopaxi-quito-ecuador' LIMIT 1), $$r/Internationalschools$$, $$ASF Monterrey (Mexico) &amp; Academia Cotopaxi (Ecuador)$$, $$Anyone have recent insights on either of these schools? Elementary in particular. I’ve never worked in the Americas, but always been keen for a different cultural experience and to learn Spanish. I understand that Latin America will not pay as well as some other areas. 

ASF Monterrey is much larger and seems very structured and organised in terms of set up and curriculum, whereas AC, as a PYP school, seems more loose and exploratory and of course, very focused on inquiry-based learning. It is also much smaller and perhaps more diverse in its student population?

I understand these would be ve$$, $$SkyValuable358$$, '2026-03-07T00:00:00.000Z', 0, ARRAY['Salary', 'Housing', 'Students']::text[]),
('reddit_1re9m0o', (SELECT id FROM schools WHERE slug = 'singapore-international-school-bangkok-bangkok-thailand' LIMIT 1), $$r/Internationalschools$$, $$Anglo Singapore International (Bangkok) thoughts?$$, $$Anglo Singapore International (Bangkok) thoughts?$$, $$Disastrous-Captain-2$$, '2026-02-25T00:00:00.000Z', 0, ARRAY['Anglo', 'Singapore', 'International']::text[]),
('reddit_1qjs9p2', (SELECT id FROM schools WHERE slug = 'mont-kiara-international-school-kuala-lumpur-malaysia' LIMIT 1), $$r/Internationalschools$$, $$International school of Ho Chi Min City or Mont'Kiara International School?$$, $$Hi everyone,

I need to make a quick decision and would really appreciate any insight from people who know these schools.

I currently have job offers fro**m** ISHCMC in Vietnam and MKIS in Malaysia. If anyone has experience with either school, I’d love to hear about their school culture and staff environment, administration and leadership support, parent community, expectations and overall pros/cons of working at either school

Any honest input would really help me make an informed choice. Thanks so much in advance!$$, $$Any_Concentrate2176$$, '2026-01-22T00:00:00.000Z', 0.5, ARRAY['Housing', 'Leadership', 'Parents', 'Culture']::text[]),
('reddit_1pp5ic5', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/Internationalschools$$, $$Looking for International Schools in Asia (Thailand / Malaysia / Vietnam / Japan) with Scholarships for Grade 11–12 / IB Diploma$$, $$Hi everyone,

I’m an Indian student (17 years old) looking for international schools in Asia that offer scholarships for Grade 11–12 or the IB Diploma, especially in Thailand, Malaysia, Vietnam, or Japan.

I want to be honest about my profile so I don’t waste anyone’s time.

I don’t have big achievements like national sports medals, Olympiads, or famous competitions. I studied in a local school where opportunities were limited, especially for sports and extracurricular activities. However, I’m genuinely interested in learning, problem-solving, and exploring new cultures.

I’ve led a school pro$$, $$One-Satisfaction-886$$, '2025-12-17T00:00:00.000Z', 0.5, ARRAY['Students', 'Culture']::text[]),
('reddit_1pllutw', (SELECT id FROM schools WHERE slug = 'ssis-ho-chi-minh-city-vietnam' LIMIT 1), $$r/Internationalschools$$, $$HCMC Sedburgh School part of CIS involving SSIS$$, $$Hi this is just an end of year rant by me.

I am talking about probably the worst thing I have ever heard a senior leader do, but two of them did it at the same time.

The vice principal and his Vietnamese wife, a principal without principles I say.

Last weekend I went out for a drink with some teaching friends, two from SSIS and a few others from other schools.

This is still a topic of conversation around District 7, Phu My Hung, District 1 and District 2, that I am aware of.

About a month ago the vice principal of Sedbergh HCMC and his Vietnamese wife went to SSIS with their students for $$, $$ProfessionalMess5850$$, '2025-12-13T00:00:00.000Z', -0.18181818181818182, ARRAY['Housing', 'Leadership', 'Workload', 'Students', 'Parents', 'Turnover']::text[]),
('reddit_1uw4s1m', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/TEFL$$, $$Unhappy with my job in Thailand. In need of advice!$$, $$Hi!

I've worked in Vietnam since October last year. I've had a very chaotic but also quite a good time out there.   
However, my contract was not prolonged, and since then I have struggled to find a new job. In the meantime, a public school work opportunity in Thailand came up. I figured that it would be a great opportunity to get more serious experience, and that it would look great on my resume. I also needed balance and a stable salary after some unfortunate events that happened to me in Vietnam - I had an accident and lost a third of my savings, among others.

Now I'm sorry to say this, b$$, $$Camouflage_Ox$$, '2026-07-14T00:00:00.000Z', 0.18181818181818182, ARRAY['Salary', 'Housing', 'Workload', 'Students', 'Tax & savings']::text[]),
('reddit_1uvm2yh', (SELECT id FROM schools WHERE slug = 'china-world-academy-suzhou-china' LIMIT 1), $$r/TEFL$$, $$Lowkey scared going to China as a British Bangladeshi to teach English$$, $$I’ve been wanting to teach abroad for a bit. I could have gone somewhere in Europe but I already live in the uk. I’ve always had an interest in East Asia and SEA but I don’t think they like us 😬😬  
Kinda worried, any south Asian teaching in China at the moment ? How’s it been for you.   
I’m worried the students are going to look at me and just say I’m Indian with a curry accent.  I mean the agency and school have seen me and gave me the offer but I don’t know if I’m doing the right thing 😭being south Asian is just hard these days the world hates us. It’s like I have to be held accountable $$, $$yoona27$$, '2026-07-13T00:00:00.000Z', 0, ARRAY['Students']::text[]),
('reddit_1usr8ij', (SELECT id FROM schools WHERE slug = 'basis-hangzhou-china' LIMIT 1), $$r/TEFL$$, $$20 years old, recently went to China and want to pick up a qualification that allows me to teach English.$$, $$Hi,

I recently went to China and had an amazing time, it was a 2 week study exchange based in two different cities. As part of my experience there I got to meet some Chinese students who have now become really good friends with me; we speak on a daily basis. I support them by speaking English and encouraging them not to translate with me. Already it is clear their English has improved and when they've spoken to my British friends on video call, even my British friends say that their English is good.

I come from an ethnic background, so growing up I had to support my mother with the English l$$, $$TechnicalTantrum$$, '2026-07-10T00:00:00.000Z', 0.6666666666666666, ARRAY['Housing', 'Students', 'Communication']::text[]),
('reddit_1uso1wt', (SELECT id FROM schools WHERE slug = 'kis-international-school-bangkok-bangkok-thailand' LIMIT 1), $$r/TEFL$$, $$Thailand TEFL Job Hunt$$, $$No experience NES:  
  
I've started to apply for jobs in Bangkok, it's been 2 weeks since I've started and I've had no interviews or responses. I believe my resume to be pretty well written, and I've highlighted I have a British accent, I have a 168hr online TEFL certificate, and I speak Thai.

Is there something I may be doing wrong or should I be looking for jobs while in Thailand in September/October? As I heard that schools aren't hiring much right now. 

Thanks guys!$$, $$ManyMany755$$, '2026-07-10T00:00:00.000Z', 0, ARRAY['Communication']::text[]),
('reddit_1ursu67', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/TEFL$$, $$Summer placement in Thailand, What to expect?$$, $$Hi,

I'm still working through my TEFL 120 course and passing the methodology assignments finally... 

I got a summer placement via my university. 

We have arrived the orientation was really warm. I am one of six of us from our university in the UK. Last group dropped out last year after two weeks but I think there were border tensions at the time. 

Each of us apart from myself and one other have met their dean of department. Myself and the person are waiting till Monday to get started. Seems like for the most part the others have finished early most days. I'm in my thirties and they are in $$, $$Difficult-Theory-306$$, '2026-07-09T00:00:00.000Z', 0, ARRAY['Students', 'Facilities', 'Communication']::text[]),
('reddit_1ur5ghs', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/TEFL$$, $$Medications situation in SK &amp; recruitment programs?$$, $$This didn't get answered in the weekly questions thread so I'm making a more in depth post, sorry to anyone who has to see both :,)

I applied to a program to be placed in a tefl position in south korea, and when I was doing the screening they said that SK wouldn't issue visas to anyone who takes any daily medication besides birth control, and that I could probably only go to China or Thailand. I've been looking through this sub and seen that yeah, the medication system is weird. I've seen some people recommend lying on the visa application and getting it shipped to SK, but also people talking$$, $$cosmic_waluigi$$, '2026-07-08T00:00:00.000Z', 0.6666666666666666, ARRAY['Relocation', 'Communication']::text[]),
('reddit_1uqw9eh', (SELECT id FROM schools WHERE slug = 'uwc-thailand-phuket-thailand' LIMIT 1), $$r/TEFL$$, $$CELTA or TEFL? Looking for advice on my long-term teaching/travel plan$$, $$Hello, I'm a 30 year old dual British and French national who has recently returned to London after 10 months in South East Asia (+1 week in China), during which I completed a 3 month Divemaster qualification in Thailand (allowing me to work as a scuba guide), and have since been investigating the possibility of teaching English.

While I enjoy having access to my games and musical instruments again, for many reasons I have decided I finally want to be able to sustain an independent life somewhere that truly resonates with me.

I have a BSc in Geography and an MA in Law and I've concluded that$$, $$blackheartwhiterose$$, '2026-07-08T00:00:00.000Z', 0.4, ARRAY['Salary', 'Housing', 'Leadership', 'Students', 'Tax & savings', 'Turnover']::text[]),
('reddit_1uqibun', (SELECT id FROM schools WHERE slug = 'hong-kong-international-school-hong-kong-hong-kong' LIMIT 1), $$r/TEFL$$, $$TEFL 100 Contact Hours Meaning? [Hong Kong Teaching Jobs]$$, $$Hello, 

I am doing a TEFL certificate for working in Hong Kong. However, they have listed on their site that 100 contact hours are required. My course is online, and 120 hours + 6 hours of teaching. I feel super lost though. I am unsure whether this counts because the 120 hours are not instructor led, they are pre-recorded classes. 

Does anyone know what contact hours even means for Hong Kong TEFL requirements? 

Thanks$$, $$WrittenByEff$$, '2026-07-08T00:00:00.000Z', 0, ARRAY['Workload', 'Students']::text[]),
('reddit_1uqgark', (SELECT id FROM schools WHERE slug = 'hong-kong-international-school-hong-kong-hong-kong' LIMIT 1), $$r/TEFL$$, $$Hong Kong NET Scheme degree requirements$$, $$I have a question about the Hong Kong NET Scheme. There is a requirement for a degree (bachelor or higher degree) related to English.

​Can anybody here share if they have been accepted on the new scheme with an unrelated undergraduate degree but a higher degree related to English? And if so, what kind of English degree do you have?$$, $$antscavemen$$, '2026-07-08T00:00:00.000Z', 0, ARRAY['Degree', 'English', 'Scheme']::text[]);
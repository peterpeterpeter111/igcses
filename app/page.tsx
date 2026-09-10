import Link from 'next/link';
import { SubjectBookLink } from '@/components/subject-book-link';
const subjects = [
  ['human-biology', 'Human Biology', '4HB1'],
  ['biology', 'Biology', '4BI1'],
  ['chemistry', 'Chemistry', '4CH1'],
  ['physics', 'Physics', '4PH1'],
  ['english', 'English Language B', '4EB1'],
  ['mathematics', 'Mathematics B', '4MB1'],
];
export default function Home() {
  return (
    <>
      <header>
        <Link className="quiz-link" href="/quiz">
          😈 Quiz mode
        </Link>
        <Link className="wordmark" href="/">
          igcses<span>THE STUDY LIBRARY</span>
        </Link>
        <span className="edition">
          Pearson Edexcel
          <br />
          International GCSE
        </span>
      </header>
      <main className="home">
        <div className="eyebrow">THE READING ROOM · NOVEMBER 2026</div>
        <h1>List of subjects available</h1>
        <p className="intro">
          Choose a subject. Build understanding, then put it to the test.
        </p>
        <section className="bookshelf" aria-labelledby="subject-shelf-title">
          <div className="shelf-header">
            <span className="shelf-petal" aria-hidden="true">
              ✿
            </span>
            <h2 id="subject-shelf-title">Choose a subject</h2>
            <span className="shelf-petal" aria-hidden="true">
              ❀
            </span>
          </div>
          <nav className="subject-list" aria-label="Subjects">
            {subjects.map(([id, name, code], i) => (
              <SubjectBookLink href={'/subjects/' + id} key={id}>
                <span className="index">0{i + 1}</span>
                <span className="subject-name">{name}</span>
                <span className="subject-code">{code}</span>
                <span className="subject-arrow" aria-hidden="true">
                  ↗
                </span>
              </SubjectBookLink>
            ))}
          </nav>
          <div className="shelf-base" aria-hidden="true" />
        </section>
        <p className="editorial">
          Independent study resource. Content and research verification are in
          progress. <Link href="/coverage">View the coverage report →</Link>
        </p>
      </main>
      <footer>
        <Link href="/history">
          History <span aria-hidden="true">↗</span>
        </Link>
        <span>Read carefully. Practise deliberately.</span>
        <Link href="/coverage">Sources & coverage</Link>
      </footer>
    </>
  );
}

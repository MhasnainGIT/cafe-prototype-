function About() {
  return (
    <div className="section" style={{ paddingTop: '120px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 className="section-title">Our Story</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-cream)', lineHeight: '1.8', marginBottom: '4rem' }}>
          Born from a passion for culinary excellence and immersive dining experiences, Flynn Cafe redefines modern hospitality. We believe that every meal should be a journey—one that delights the palate and engages the senses.
        </p>
      </div>

      <div style={{
        width: '100vw',
        marginLeft: '-5%',
        height: '60vh',
        background: 'url(/assets/hero-poster.jpg) center/cover fixed',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 14, 13, 0.6)'
        }} />
      </div>

      <div style={{ maxWidth: '800px', margin: '4rem auto 0', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', fontSize: '2.5rem', marginBottom: '2rem' }}>
          The Philosophy
        </h2>
        <p style={{ color: 'var(--color-muted)', lineHeight: '1.8' }}>
          Our kitchen is a laboratory of flavors, where traditional techniques meet cutting-edge culinary innovation. Every ingredient is thoughtfully sourced, and every dish is a testament to our commitment to quality. Step into our world, and let us take you on an unforgettable journey.
        </p>
      </div>
    </div>
  );
}

export default About;

const slugs = ['namakamu', 'tokoku', 'portfolio', 'myband', 'freelancer'];
let slugIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typeEl = document.getElementById('typewriter');

function typewrite() {
  const current = slugs[slugIndex];

  if (!isDeleting) {
    typeEl.textContent = current.slice(0, charIndex + 1);
    charIndex++;
    if (charIndex === current.length) {
      setTimeout(() => { isDeleting = true; typewrite(); }, 2000);
      return;
    }
  } else {
    typeEl.textContent = current.slice(0, charIndex - 1);
    charIndex--;
    if (charIndex === 0) {
      isDeleting = false;
      slugIndex = (slugIndex + 1) % slugs.length;
    }
  }

  setTimeout(typewrite, isDeleting ? 50 : 100);
}

typewrite();

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(card);
});

document.addEventListener('scroll', () => {
  document.querySelectorAll('.feature-card.visible').forEach(card => {
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
  });
});

const style = document.createElement('style');
style.textContent = `.feature-card.visible{opacity:1!important;transform:translateY(0)!important}`;
document.head.appendChild(style);

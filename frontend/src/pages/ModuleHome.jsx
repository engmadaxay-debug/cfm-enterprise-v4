
import PageHeader from '../components/PageHeader';
export default function ModuleHome({title, items=[]}){ return <><PageHeader title={title} subtitle="Feature group ready in CFM v2.0"/><section className="panel"><h2>{title}</h2><div className="feature-grid">{items.map(x=><div className="feature-card" key={x}><strong>{x}</strong><span>Ready menu section</span></div>)}</div></section></> }

import { Construct, IConstruct, ISynthesisSession, Node } from 'constructs';
import { resolve } from './_tokens'
import * as fs from 'fs';
import * as path from 'path';
import { TerraformElement } from './terraform-element';
import { deepMerge } from './util';

export class TerraformStack extends Construct {
  public readonly artifactFile: string;
  public readonly providerFile: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.artifactFile = `${Node.of(this).uniqueId}.tf.json`;
    this.providerFile = `providers.tf.json`;
  }

  public toTerraform(): any {
    const tf = { };

    const visit = (node: IConstruct) => {
      if (node instanceof TerraformElement) {
        deepMerge(tf, node.toTerraform());
      }

      for (const child of Node.of(node).children) {
        visit(child);
      }
    }

    visit(this);

    return resolve(this, tf)
  }

  public onSynthesize(session: ISynthesisSession) {
    const resourceOutput = path.join(session.outdir, this.artifactFile);
    const providerOutput = path.join(session.outdir, this.providerFile);
    const { resource, module, output, provider } = this.toTerraform()

    fs.writeFileSync(resourceOutput, JSON.stringify({resource, module, output}, undefined, 2));

    if (fs.existsSync(providerOutput)) {
      const existingProvider = JSON.parse(fs.readFileSync(providerOutput).toString())
      fs.writeFileSync(providerOutput, JSON.stringify(Object.assign({}, {terraform: existingProvider.terraform}, {provider}), undefined, 2));
    } else {
      fs.writeFileSync(providerOutput, JSON.stringify({provider}, undefined, 2));
    }
  }
}
